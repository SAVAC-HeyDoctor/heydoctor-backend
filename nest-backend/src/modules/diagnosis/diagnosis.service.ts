import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Diagnostic, Consultation } from '../../entities';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { UpdateDiagnosisDto } from './dto/update-diagnosis.dto';

@Injectable()
export class DiagnosisService {
  constructor(
    @InjectRepository(Diagnostic)
    private readonly diagnosticRepo: Repository<Diagnostic>,
    @InjectRepository(Consultation)
    private readonly consultationRepo: Repository<Consultation>,
  ) {}

  async findByConsultation(consultationId: string) {
    const diagnostic = await this.diagnosticRepo.findOne({
      where: { consultationId },
      relations: ['consultation', 'cie10_code', 'clinicalRecord'],
    });
    return { data: diagnostic };
  }

  async findOne(id: string) {
    const diagnostic = await this.diagnosticRepo.findOne({
      where: { id },
      relations: ['consultation', 'cie10_code', 'clinicalRecord'],
    });
    if (!diagnostic) {
      throw new NotFoundException(`Diagnosis with id ${id} not found`);
    }
    return { data: diagnostic };
  }

  async create(dto: CreateDiagnosisDto) {
    const consultation = await this.consultationRepo.findOne({
      where: { id: dto.consultationId },
    });
    if (!consultation) {
      throw new BadRequestException(
        `Consultation ${dto.consultationId} not found`,
      );
    }

    const existing = await this.diagnosticRepo.findOne({
      where: { consultationId: dto.consultationId },
    });
    if (existing) {
      throw new BadRequestException(
        `Consultation ${dto.consultationId} already has a diagnosis`,
      );
    }

    const diagnostic = this.diagnosticRepo.create({
      ...dto,
      diagnostic_date: dto.diagnostic_date
        ? new Date(dto.diagnostic_date)
        : new Date(),
      type: dto.type ?? 'principal',
    });
    const saved = await this.diagnosticRepo.save(diagnostic);
    return { data: saved };
  }

  async update(id: string, dto: UpdateDiagnosisDto) {
    const diagnostic = await this.diagnosticRepo.findOne({ where: { id } });
    if (!diagnostic) {
      throw new NotFoundException(`Diagnosis with id ${id} not found`);
    }
    Object.assign(diagnostic, dto);
    if (dto.diagnostic_date) {
      diagnostic.diagnostic_date = new Date(dto.diagnostic_date);
    }
    const saved = await this.diagnosticRepo.save(diagnostic);
    return { data: saved };
  }

  async remove(id: string) {
    const diagnostic = await this.diagnosticRepo.findOne({ where: { id } });
    if (!diagnostic) {
      throw new NotFoundException(`Diagnosis with id ${id} not found`);
    }
    await this.diagnosticRepo.remove(diagnostic);
    return { data: diagnostic };
  }
}
