import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation, Patient, Doctor } from '../../entities';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { ConsultationFiltersDto } from './dto/consultation-filters.dto';
import {
  assertClinicMatch,
  requireClinicId,
} from '../../common/utils/clinic-scope.util';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepo: Repository<Consultation>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  async findAll(
    clinicId: string | undefined | null,
    filters?: ConsultationFiltersDto,
  ): Promise<{ data: Consultation[]; total: number }> {
    const cid = requireClinicId(clinicId);
    const qb = this.consultationRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.patient', 'patient')
      .leftJoinAndSelect('c.doctor', 'doctor')
      .leftJoinAndSelect('c.clinic', 'clinic')
      .leftJoinAndSelect('c.clinical_record', 'clinical_record')
      .leftJoinAndSelect('c.diagnostic', 'diagnostic')
      .leftJoinAndSelect('c.lab_orders', 'lab_orders')
      .leftJoinAndSelect('c.prescriptions', 'prescriptions')
      .where('c.clinicId = :clinicId', { clinicId: cid });

    if (filters?.patientId) {
      qb.andWhere('c.patientId = :patientId', { patientId: filters.patientId });
    }
    if (filters?.doctorId) {
      qb.andWhere('c.doctorId = :doctorId', { doctorId: filters.doctorId });
    }
    if (filters?.status) {
      qb.andWhere('c.status = :status', { status: filters.status });
    }
    if (filters?.from) {
      qb.andWhere('c.date >= :from', { from: filters.from });
    }
    if (filters?.to) {
      qb.andWhere('c.date <= :to', { to: filters.to });
    }

    const [items, total] = await qb
      .orderBy('c.date', 'DESC')
      .skip(filters?.offset ?? 0)
      .take(filters?.limit ?? 20)
      .getManyAndCount();

    return { data: items, total };
  }

  async findOne(
    id: string,
    clinicId: string | undefined | null,
  ): Promise<{ data: Consultation }> {
    const cid = requireClinicId(clinicId);
    const consultation = await this.consultationRepo.findOne({
      where: { id },
      relations: [
        'patient',
        'doctor',
        'clinic',
        'clinical_record',
        'diagnostic',
        'diagnostic.cie_10_code',
        'lab_orders',
        'lab_orders.diagnosis',
        'prescriptions',
        'prescriptions.diagnosis',
      ],
    });
    if (!consultation) {
      throw new NotFoundException(`Consultation with id ${id} not found`);
    }
    assertClinicMatch(consultation.clinicId, cid);
    return { data: consultation };
  }

  async create(
    dto: CreateConsultationDto,
    clinicId: string | undefined | null,
  ): Promise<{ data: Consultation }> {
    const cid = requireClinicId(clinicId);
    const patient = await this.patientRepo.findOne({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new BadRequestException(`Patient ${dto.patientId} not found`);
    }
    assertClinicMatch(patient.clinicId, cid);

    const doctor = await this.doctorRepo.findOne({
      where: { id: dto.doctorId },
    });
    if (!doctor) {
      throw new BadRequestException(`Doctor ${dto.doctorId} not found`);
    }
    assertClinicMatch(doctor.clinicId, cid);

    const consultation = this.consultationRepo.create({
      patientId: dto.patientId,
      doctorId: dto.doctorId,
      clinicId: cid,
      clinicalRecordId: dto.clinicalRecordId ?? null,
      date: new Date(dto.date),
      duration: dto.duration ?? 45,
      status: dto.status ?? 'scheduled',
      confirmed: dto.confirmed ?? false,
      appointment_reason: dto.appointment_reason ?? null,
      notes: dto.notes ?? null,
      files: dto.files ?? null,
      active: dto.active ?? true,
    });
    const saved = await this.consultationRepo.save(consultation);
    return { data: saved };
  }

  async update(
    id: string,
    dto: UpdateConsultationDto,
    clinicId: string | undefined | null,
  ): Promise<{ data: Consultation }> {
    const cid = requireClinicId(clinicId);
    const consultation = await this.consultationRepo.findOne({ where: { id } });
    if (!consultation) {
      throw new NotFoundException(`Consultation with id ${id} not found`);
    }
    assertClinicMatch(consultation.clinicId, cid);

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

    Object.assign(consultation, dto);
    consultation.clinicId = cid;
    if (dto.date) {
      consultation.date = new Date(dto.date);
    }
    const saved = await this.consultationRepo.save(consultation);
    return { data: saved };
  }

  async remove(
    id: string,
    clinicId: string | undefined | null,
  ): Promise<{ data: Consultation }> {
    const cid = requireClinicId(clinicId);
    const consultation = await this.consultationRepo.findOne({ where: { id } });
    if (!consultation) {
      throw new NotFoundException(`Consultation with id ${id} not found`);
    }
    assertClinicMatch(consultation.clinicId, cid);
    await this.consultationRepo.remove(consultation);
    return { data: consultation };
  }
}
