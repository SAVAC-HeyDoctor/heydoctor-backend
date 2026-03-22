import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Consultation,
  Diagnosis,
  Doctor,
  LabOrder,
  Patient,
  Prescription,
  Payment,
} from '../../entities';
import { AuthActor } from '../interfaces/auth-actor.interface';
import {
  assertClinicMatch,
  requireClinicId,
} from '../utils/clinic-scope.util';

export type OwnershipResource =
  | { type: 'consultation'; entity: Consultation }
  | { type: 'patient'; patientId: string }
  | { type: 'prescription'; entity: Prescription }
  | { type: 'lab_order'; entity: LabOrder }
  | { type: 'diagnosis'; entity: Diagnosis }
  | { type: 'payment'; entity: Payment };

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Consultation)
    private readonly consultationRepo: Repository<Consultation>,
  ) {}

  /**
   * Perfil Doctor vinculado al usuario JWT en la clínica activa.
   */
  async resolveDoctorForUser(
    userId: string,
    clinicId: string | undefined | null,
  ): Promise<Doctor> {
    const cid = requireClinicId(clinicId);
    const doctor = await this.doctorRepo.findOne({
      where: { userId, clinicId: cid },
    });
    if (!doctor) {
      throw new ForbiddenException(
        'Doctor profile not found for this user and clinic',
      );
    }
    return doctor;
  }

  /**
   * Paciente existe y pertenece a la clínica del actor.
   */
  async assertPatientInClinic(
    patientId: string,
    clinicId: string | undefined | null,
  ): Promise<Patient> {
    const cid = requireClinicId(clinicId);
    const patient = await this.patientRepo.findOne({
      where: { id: patientId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient with id ${patientId} not found`);
    }
    assertClinicMatch(patient.clinicId, cid);
    return patient;
  }

  assertConsultationOwnedByDoctor(
    consultation: Consultation,
    doctor: Doctor,
  ): void {
    if (consultation.doctorId !== doctor.id) {
      throw new ForbiddenException(
        'Consultation is assigned to another doctor',
      );
    }
  }

  assertPrescriptionOwnedByDoctor(
    prescription: Prescription,
    doctor: Doctor,
  ): void {
    if (prescription.doctorId !== doctor.id) {
      throw new ForbiddenException(
        'Prescription was issued by another doctor',
      );
    }
  }

  assertLabOrderOwnedByDoctor(order: LabOrder, doctor: Doctor): void {
    if (order.doctorId !== doctor.id) {
      throw new ForbiddenException('Lab order was created by another doctor');
    }
  }

  /**
   * Diagnóstico: misma clínica y, si hay consulta vinculada, mismo médico titular.
   */
  async assertDiagnosisActionAllowed(
    diagnosis: Diagnosis,
    doctor: Doctor,
    clinicId: string | undefined | null,
  ): Promise<void> {
    const cid = requireClinicId(clinicId);
    assertClinicMatch(diagnosis.clinicId, cid);

    if (diagnosis.consultationId) {
      const consultation = await this.consultationRepo.findOne({
        where: { id: diagnosis.consultationId },
      });
      if (consultation) {
        this.assertConsultationOwnedByDoctor(consultation, doctor);
        return;
      }
    }

    if (diagnosis.doctorId && diagnosis.doctorId !== doctor.id) {
      throw new ForbiddenException('Diagnosis belongs to another doctor');
    }
  }

  /**
   * WebRTC ICE: solo el médico asignado o el paciente con cuenta vinculada (userId).
   */
  async assertConsultationParticipantForWebRtc(
    consultationId: string,
    userId: string,
    clinicId: string | undefined | null,
  ): Promise<Consultation> {
    const cid = requireClinicId(clinicId);
    const consultation = await this.consultationRepo.findOne({
      where: { id: consultationId },
      relations: ['doctor', 'patient'],
    });
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }
    assertClinicMatch(consultation.clinicId, cid);

    const isDoctor =
      consultation.doctor != null && consultation.doctor.userId === userId;
    const isPatient =
      consultation.patient != null &&
      consultation.patient.userId != null &&
      consultation.patient.userId === userId;

    if (!isDoctor && !isPatient) {
      throw new ForbiddenException(
        'Not authorized to access WebRTC for this consultation',
      );
    }

    return consultation;
  }

  /**
   * Punto único reutilizable: valida tenant + propiedad médico cuando aplica.
   */
  async assertOwnership(
    resource: OwnershipResource,
    actor: AuthActor,
  ): Promise<Patient | void> {
    const doctor = await this.resolveDoctorForUser(
      actor.userId,
      actor.clinicId,
    );

    switch (resource.type) {
      case 'patient':
        return this.assertPatientInClinic(resource.patientId, actor.clinicId);

      case 'consultation':
        assertClinicMatch(resource.entity.clinicId, actor.clinicId);
        this.assertConsultationOwnedByDoctor(resource.entity, doctor);
        return;

      case 'prescription':
        assertClinicMatch(resource.entity.clinicId, actor.clinicId);
        this.assertPrescriptionOwnedByDoctor(resource.entity, doctor);
        return;

      case 'lab_order':
        assertClinicMatch(resource.entity.clinicId, actor.clinicId);
        this.assertLabOrderOwnedByDoctor(resource.entity, doctor);
        return;

      case 'diagnosis':
        await this.assertDiagnosisActionAllowed(
          resource.entity,
          doctor,
          actor.clinicId,
        );
        return;

      case 'payment':
        assertClinicMatch(resource.entity.clinicId, actor.clinicId);
        if (resource.entity.userId !== actor.userId) {
          throw new ForbiddenException('Payment belongs to another user');
        }
        return;
    }
  }
}
