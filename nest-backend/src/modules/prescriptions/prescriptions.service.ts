import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prescription, Medication, Patient, Doctor } from '../../entities';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { PrescriptionFiltersDto } from './dto/prescription-filters.dto';
import {
  assertClinicMatch,
  requireClinicId,
} from '../../common/utils/clinic-scope.util';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(Medication)
    private readonly medicationRepo: Repository<Medication>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  async findAll(
    clinicId: string | undefined | null,
    filters?: PrescriptionFiltersDto,
  ): Promise<{ data: Prescription[]; total: number }> {
    const cid = requireClinicId(clinicId);
    const qb = this.prescriptionRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.patient', 'patient')
      .leftJoinAndSelect('p.doctor', 'doctor')
      .leftJoinAndSelect('p.clinic', 'clinic')
      .leftJoinAndSelect('p.consultation', 'consultation')
      .leftJoinAndSelect('p.diagnosis', 'diagnosis')
      .where('p.clinicId = :clinicId', { clinicId: cid });

    if (filters?.patientId) {
      qb.andWhere('p.patientId = :patientId', {
        patientId: filters.patientId,
      });
    }
    if (filters?.doctorId) {
      qb.andWhere('p.doctorId = :doctorId', { doctorId: filters.doctorId });
    }
    if (filters?.consultationId) {
      qb.andWhere('p.consultationId = :consultationId', {
        consultationId: filters.consultationId,
      });
    }
    if (filters?.diagnosisId) {
      qb.andWhere('p.diagnosisId = :diagnosisId', {
        diagnosisId: filters.diagnosisId,
      });
    }

    const [items, total] = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip(filters?.offset ?? 0)
      .take(filters?.limit ?? 20)
      .getManyAndCount();

    return { data: items, total };
  }

  async findOne(
    id: string,
    clinicId: string | undefined | null,
  ): Promise<{ data: Prescription }> {
    const cid = requireClinicId(clinicId);
    const prescription = await this.prescriptionRepo.findOne({
      where: { id },
      relations: [
        'patient',
        'doctor',
        'clinic',
        'consultation',
        'diagnosis',
      ],
    });
    if (!prescription) {
      throw new NotFoundException(`Prescription with id ${id} not found`);
    }
    assertClinicMatch(prescription.clinicId, cid);
    return { data: prescription };
  }

  async create(
    clinicId: string,
    doctorId: string,
    dto: CreatePrescriptionDto,
  ) {
    const cid = requireClinicId(clinicId);
    const patient = await this.patientRepo.findOne({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new BadRequestException(`Patient ${dto.patientId} not found`);
    }
    assertClinicMatch(patient.clinicId, cid);

    const prescription = this.prescriptionRepo.create({
      clinicId: cid,
      doctorId,
      patientId: dto.patientId,
      consultationId: dto.consultationId ?? null,
      diagnosisId: dto.diagnosisId ?? null,
      medications: dto.medications ?? [],
      dosage: dto.dosage ?? null,
      instructions: dto.instructions ?? null,
      notes: dto.notes ?? null,
    });
    const saved = await this.prescriptionRepo.save(prescription);
    return { data: saved };
  }

  async update(
    id: string,
    dto: UpdatePrescriptionDto,
    clinicId: string | undefined | null,
  ): Promise<{ data: Prescription }> {
    const cid = requireClinicId(clinicId);
    const prescription = await this.prescriptionRepo.findOne({ where: { id } });
    if (!prescription) {
      throw new NotFoundException(`Prescription with id ${id} not found`);
    }
    assertClinicMatch(prescription.clinicId, cid);

    if (dto.patientId) {
      const patient = await this.patientRepo.findOne({
        where: { id: dto.patientId },
      });
      if (!patient) {
        throw new BadRequestException(`Patient ${dto.patientId} not found`);
      }
      assertClinicMatch(patient.clinicId, cid);
    }
    if (dto.doctorId) {
      const doctor = await this.doctorRepo.findOne({
        where: { id: dto.doctorId },
      });
      if (!doctor) {
        throw new BadRequestException(`Doctor ${dto.doctorId} not found`);
      }
      assertClinicMatch(doctor.clinicId, cid);
    }

    Object.assign(prescription, dto);
    prescription.clinicId = cid;
    const saved = await this.prescriptionRepo.save(prescription);
    return { data: saved };
  }

  async remove(
    id: string,
    clinicId: string | undefined | null,
  ): Promise<{ data: Prescription }> {
    const cid = requireClinicId(clinicId);
    const prescription = await this.prescriptionRepo.findOne({ where: { id } });
    if (!prescription) {
      throw new NotFoundException(`Prescription with id ${id} not found`);
    }
    assertClinicMatch(prescription.clinicId, cid);
    await this.prescriptionRepo.remove(prescription);
    return { data: prescription };
  }

  async getByPatient(
    patientId: string,
    clinicId: string | undefined | null,
  ) {
    const cid = requireClinicId(clinicId);
    const patient = await this.patientRepo.findOne({
      where: { id: patientId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    assertClinicMatch(patient.clinicId, cid);

    const prescriptions = await this.prescriptionRepo.find({
      where: { patientId, clinicId: cid },
      relations: ['consultation', 'diagnosis'],
      order: { createdAt: 'DESC' },
    });
    return { data: prescriptions };
  }

  async suggestMedications(query: string) {
    if (!query || query.length < 2) {
      const meds = await this.medicationRepo.find({ take: 15 });
      return { data: meds.map((m) => m.name) };
    }

    const medications = await this.medicationRepo
      .createQueryBuilder('m')
      .where('m.name ILIKE :q OR m.genericName ILIKE :q', {
        q: `%${query}%`,
      })
      .take(20)
      .getMany();

    return { data: medications.map((m) => m.name) };
  }
}
