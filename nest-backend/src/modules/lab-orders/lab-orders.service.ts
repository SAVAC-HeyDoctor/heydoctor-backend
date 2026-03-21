import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LabOrder, Patient, Doctor } from '../../entities';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { UpdateLabOrderDto } from './dto/update-lab-order.dto';
import { LabOrderFiltersDto } from './dto/lab-order-filters.dto';
import {
  assertClinicMatch,
  requireClinicId,
} from '../../common/utils/clinic-scope.util';

@Injectable()
export class LabOrdersService {
  constructor(
    @InjectRepository(LabOrder)
    private readonly labOrderRepo: Repository<LabOrder>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  async findAll(
    clinicId: string | undefined | null,
    filters?: LabOrderFiltersDto,
  ): Promise<{ data: LabOrder[]; total: number }> {
    const cid = requireClinicId(clinicId);
    const qb = this.labOrderRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.patient', 'patient')
      .leftJoinAndSelect('l.doctor', 'doctor')
      .leftJoinAndSelect('l.clinic', 'clinic')
      .leftJoinAndSelect('l.consultation', 'consultation')
      .leftJoinAndSelect('l.diagnosis', 'diagnosis')
      .where('l.clinicId = :clinicId', { clinicId: cid });

    if (filters?.patientId) {
      qb.andWhere('l.patientId = :patientId', {
        patientId: filters.patientId,
      });
    }
    if (filters?.doctorId) {
      qb.andWhere('l.doctorId = :doctorId', { doctorId: filters.doctorId });
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

  async findOne(
    id: string,
    clinicId: string | undefined | null,
  ): Promise<{ data: LabOrder }> {
    const cid = requireClinicId(clinicId);
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
    assertClinicMatch(order.clinicId, cid);
    return { data: order };
  }

  async create(
    clinicId: string,
    doctorId: string,
    dto: CreateLabOrderDto,
  ) {
    const cid = requireClinicId(clinicId);
    const patient = await this.patientRepo.findOne({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new BadRequestException(`Patient ${dto.patientId} not found`);
    }
    assertClinicMatch(patient.clinicId, cid);

    const order = this.labOrderRepo.create({
      clinicId: cid,
      doctorId,
      patientId: dto.patientId,
      consultationId: dto.consultationId ?? null,
      diagnosisId: dto.diagnosisId ?? null,
      lab_tests: dto.lab_tests ?? [],
      status: (dto.status ?? 'pending') as LabOrder['status'],
      priority: (dto.priority ?? 'routine') as LabOrder['priority'],
      diagnosis_code: dto.diagnosis_code ?? null,
      notes: dto.notes ?? null,
    });
    const saved = await this.labOrderRepo.save(order);
    return { data: saved };
  }

  async update(
    id: string,
    dto: UpdateLabOrderDto,
    clinicId: string | undefined | null,
  ): Promise<{ data: LabOrder }> {
    const cid = requireClinicId(clinicId);
    const order = await this.labOrderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Lab order with id ${id} not found`);
    }
    assertClinicMatch(order.clinicId, cid);

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

    Object.assign(order, dto);
    order.clinicId = cid;
    const saved = await this.labOrderRepo.save(order);
    return { data: saved };
  }

  async remove(
    id: string,
    clinicId: string | undefined | null,
  ): Promise<{ data: LabOrder }> {
    const cid = requireClinicId(clinicId);
    const order = await this.labOrderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Lab order with id ${id} not found`);
    }
    assertClinicMatch(order.clinicId, cid);
    await this.labOrderRepo.remove(order);
    return { data: order };
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

    const orders = await this.labOrderRepo.find({
      where: { patientId, clinicId: cid },
      relations: ['consultation', 'diagnosis'],
      order: { createdAt: 'DESC' },
    });
    return { data: orders };
  }

  async suggestTests(query: string) {
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
