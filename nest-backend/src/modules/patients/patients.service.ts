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

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  async findAll(
    clinicId?: string,
    filters?: PatientFiltersDto,
  ): Promise<{ data: Patient[]; total?: number }> {
    const qb = this.patientRepo.createQueryBuilder('p');
    if (clinicId) {
      qb.where('p.clinicId = :clinicId', { clinicId });
    }
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

  async findOne(id: string): Promise<{ data: Patient }> {
    const patient = await this.patientRepo.findOne({
      where: { id },
      relations: ['clinic', 'user'],
    });
    if (!patient) {
      throw new NotFoundException(`Patient with id ${id} not found`);
    }
    return { data: patient };
  }

  async create(dto: CreatePatientDto): Promise<{ data: Patient }> {
    const existing = await this.patientRepo.findOne({
      where: { identification: dto.identification },
    });
    if (existing) {
      throw new ConflictException(
        `Patient with identification ${dto.identification} already exists`,
      );
    }
    const patient = this.patientRepo.create({
      ...dto,
      birth_date: new Date(dto.birth_date),
    });
    const saved = await this.patientRepo.save(patient);
    return { data: saved };
  }

  async update(id: string, dto: UpdatePatientDto): Promise<{ data: Patient }> {
    const patient = await this.patientRepo.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException(`Patient with id ${id} not found`);
    }
    if (dto.identification && dto.identification !== patient.identification) {
      const existing = await this.patientRepo.findOne({
        where: { identification: dto.identification },
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
    const saved = await this.patientRepo.save(patient);
    return { data: saved };
  }

  async remove(id: string): Promise<{ data: Patient }> {
    const patient = await this.patientRepo.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException(`Patient with id ${id} not found`);
    }
    await this.patientRepo.remove(patient);
    return { data: patient };
  }
}
