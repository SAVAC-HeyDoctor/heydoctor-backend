import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LabOrder, Patient, Medication } from '../../entities';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { UpdateLabOrderDto } from './dto/update-lab-order.dto';
import { LabOrderFiltersDto } from './dto/lab-order-filters.dto';

@Injectable()
export class LabOrdersService {
  constructor(
    @InjectRepository(LabOrder)
    private readonly labOrderRepo: Repository<LabOrder>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Medication)
    private readonly medicationRepo: Repository<Medication>,
  ) {}

  async findAll(
    filters?: LabOrderFiltersDto,
  ): Promise<{ data: LabOrder[]; total: number }> {
    const qb = this.labOrderRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.patient', 'patient')
      .leftJoinAndSelect('l.doctor', 'doctor')
      .leftJoinAndSelect('l.clinic', 'clinic')
      .leftJoinAndSelect('l.consultation', 'consultation')
      .leftJoinAndSelect('l.diagnosis', 'diagnosis');

    if (filters?.patientId) {
      qb.andWhere('l.patientId = :patientId', {
        patientId: filters.patientId,
      });
    }
    if (filters?.doctorId) {
      qb.andWhere('l.doctorId = :doctorId', { doctorId: filters.doctorId });
    }
    if (filters?.clinicId) {
      qb.andWhere('l.clinicId = :clinicId', { clinicId: filters.clinicId });
    }
    if (filters?.consultationId) {
      qb.andWhere('l.consultationId = :consultationId', {
        consultationId: filters.consultationId,
      });
    }
    if (filters?.diagnosisId) {
      qb.andWhere('l.diagnosisId = :diagnosisId', {
        diagnosisId: filters.diagnosisId,
      });
    }

    const [items, total] = await qb
      .orderBy('l.createdAt', 'DESC')
      .skip(filters?.offset ?? 0)
      .take(filters?.limit ?? 20)
      .getManyAndCount();

    return { data: items, total };
  }

  async findOne(id: string): Promise<{ data: LabOrder }> {
    const order = await this.labOrderRepo.findOne({
      where: { id },
      relations: [
        'patient',
        'doctor',
        'clinic',
        'consultation',
        'diagnosis',
      ],
    });
    if (!order) {
      throw new NotFoundException(`Lab order with id ${id} not found`);
    }
    return { data: order };
  }

  async create(
    clinicId: string,
    doctorId: string,
    dto: CreateLabOrderDto,
  ) {
    const order = this.labOrderRepo.create({
      clinicId: dto.clinicId ?? clinicId,
      doctorId: dto.doctorId ?? doctorId,
      patientId: dto.patientId,
      consultationId: dto.consultationId,
      diagnosisId: dto.diagnosisId,
      lab_tests: dto.lab_tests ?? [],
      status: (dto.status ?? 'pending') as LabOrder['status'],
      priority: (dto.priority ?? 'routine') as LabOrder['priority'],
      diagnosis_code: dto.diagnosis_code,
      notes: dto.notes,
    });
    const saved = await this.labOrderRepo.save(order);
    return { data: saved };
  }

  async update(
    id: string,
    dto: UpdateLabOrderDto,
  ): Promise<{ data: LabOrder }> {
    const order = await this.labOrderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Lab order with id ${id} not found`);
    }
    Object.assign(order, dto);
    const saved = await this.labOrderRepo.save(order);
    return { data: saved };
  }

  async remove(id: string): Promise<{ data: LabOrder }> {
    const order = await this.labOrderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Lab order with id ${id} not found`);
    }
    await this.labOrderRepo.remove(order);
    return { data: order };
  }

  async getByPatient(patientId: string, clinicId: string) {
    const orders = await this.labOrderRepo.find({
      where: { patientId, clinicId },
      relations: ['consultation', 'diagnosis'],
      order: { createdAt: 'DESC' },
    });
    return { data: orders };
  }

  async suggestTests(query: string) {
    // Mock/common lab tests - in production could use a lab tests catalog
    const commonTests = [
      'Hemograma completo',
      'Glucosa en ayunas',
      'Perfil lipídico',
      'Creatinina',
      'Urea',
      'TSH',
      'T4 libre',
      'PCR',
      'Ferritina',
      'Vitamina D',
      'HbA1c',
      'Orina completa',
      'Coprocultivo',
    ];

    if (!query || query.length < 2) {
      return { data: commonTests.slice(0, 10) };
    }

    const q = query.toLowerCase();
    const filtered = commonTests.filter((t) => t.toLowerCase().includes(q));
    return { data: filtered.length > 0 ? filtered : commonTests.slice(0, 5) };
  }
}
