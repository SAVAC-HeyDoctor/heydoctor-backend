import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../../entities';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientFiltersDto } from '../clinic/dto/patient-filters.dto';
import {
  assertClinicMatch,
  requireClinicId,
} from '../../common/utils/clinic-scope.util';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  async findAll(
    clinicId: string | undefined | null,
    filters?: PatientFiltersDto,
  ): Promise<{ data: Patient[]; total?: number }> {
    const cid = requireClinicId(clinicId);
    const qb = this.patientRepo
      .createQueryBuilder('p')
      .where('p.clinicId = :clinicId', { clinicId: cid });
    if (filters?.search) {
      qb.andWhere(
        '(p.firstname ILIKE :search OR p.lastname ILIKE :search OR p.identification ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    const [items, total] = await qb
      .orderBy('p.lastname', 'ASC')
      .addOrderBy('p.firstname', 'ASC')
      .skip(filters?.offset ?? 0)
      .take(filters?.limit ?? 20)
      .getManyAndCount();
    return { data: items, total };
  }

  async findOne(
    id: string,
    clinicId: string | undefined | null,
  ): Promise<{ data: Patient }> {
    const cid = requireClinicId(clinicId);
    const patient = await this.patientRepo.findOne({
      where: { id },
      relations: ['clinic', 'user'],
    });
    if (!patient) {
      throw new NotFoundException(`Patient with id ${id} not found`);
    }
    assertClinicMatch(patient.clinicId, cid);
    return { data: patient };
  }

  async create(
    dto: CreatePatientDto,
    clinicId: string | undefined | null,
  ): Promise<{ data: Patient }> {
    const cid = requireClinicId(clinicId);
    const existing = await this.patientRepo.findOne({
      where: { identification: dto.identification, clinicId: cid },
    });
    if (existing) {
      throw new ConflictException(
        `Patient with identification ${dto.identification} already exists`,
      );
    }
    const patient = this.patientRepo.create({
      ...dto,
      clinicId: cid,
      birth_date: new Date(dto.birth_date),
    });
    const saved = await this.patientRepo.save(patient);
    return { data: saved };
  }

  async update(
    id: string,
    dto: UpdatePatientDto,
    clinicId: string | undefined | null,
  ): Promise<{ data: Patient }> {
    const cid = requireClinicId(clinicId);
    const patient = await this.patientRepo.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException(`Patient with id ${id} not found`);
    }
    assertClinicMatch(patient.clinicId, cid);
    if (dto.identification && dto.identification !== patient.identification) {
      const existing = await this.patientRepo.findOne({
        where: { identification: dto.identification, clinicId: cid },
      });
      if (existing) {
        throw new ConflictException(
          `Patient with identification ${dto.identification} already exists`,
        );
      }
    }
    Object.assign(patient, dto);
    if (dto.birth_date) {
      patient.birth_date = new Date(dto.birth_date);
    }
    patient.clinicId = cid;
    const saved = await this.patientRepo.save(patient);
    return { data: saved };
  }

  async remove(
    id: string,
    clinicId: string | undefined | null,
  ): Promise<{ data: Patient }> {
    const cid = requireClinicId(clinicId);
    const patient = await this.patientRepo.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException(`Patient with id ${id} not found`);
    }
    assertClinicMatch(patient.clinicId, cid);
    await this.patientRepo.remove(patient);
    return { data: patient };
  }
}
