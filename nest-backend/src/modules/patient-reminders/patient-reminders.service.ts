import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientReminder } from '../../entities';
import { requireClinicId } from '../../common/utils/clinic-scope.util';
import { AuthorizationService } from '../../common/services/authorization.service';
import type { AuthActor } from '../../common/interfaces/auth-actor.interface';

@Injectable()
export class PatientRemindersService {
  constructor(
    @InjectRepository(PatientReminder)
    private readonly reminderRepo: Repository<PatientReminder>,
    private readonly authz: AuthorizationService,
  ) {}

  async findAll(
    clinicId: string | undefined | null,
    patientId: string | undefined,
    actor: AuthActor,
  ) {
    const cid = requireClinicId(clinicId);
    await this.authz.resolveDoctorForUser(actor.userId, cid);
    if (patientId) {
      await this.authz.assertPatientInClinic(patientId, cid);
    }

    const qb = this.reminderRepo
      .createQueryBuilder('r')
      .leftJoin('r.patient', 'p')
      .where('p.clinicId = :clinicId', { clinicId: cid });

    if (patientId) {
      qb.andWhere('r.patientId = :patientId', { patientId });
    }

    const items = await qb
      .orderBy('r.dueDate', 'ASC')
      .addOrderBy('r.createdAt', 'DESC')
      .getMany();

    return { data: items };
  }

  async create(
    clinicId: string | undefined | null,
    dto: { patientId: string; reminderType: string; dueDate: string; notes?: string },
    actor: AuthActor,
  ) {
    const cid = requireClinicId(clinicId);
    await this.authz.resolveDoctorForUser(actor.userId, cid);
    await this.authz.assertPatientInClinic(dto.patientId, cid);

    const reminder = this.reminderRepo.create({
      patientId: dto.patientId,
      reminderType: dto.reminderType,
      dueDate: new Date(dto.dueDate),
      notes: dto.notes,
    });
    const saved = await this.reminderRepo.save(reminder);
    return { data: saved };
  }

  async update(
    id: string,
    clinicId: string | undefined | null,
    dto: { reminderType?: string; dueDate?: string; status?: string; notes?: string },
    actor: AuthActor,
  ) {
    const cid = requireClinicId(clinicId);
    await this.authz.resolveDoctorForUser(actor.userId, cid);

    const reminder = await this.reminderRepo
      .createQueryBuilder('r')
      .leftJoin('r.patient', 'p')
      .where('r.id = :id', { id })
      .andWhere('p.clinicId = :clinicId', { clinicId: cid })
      .getOne();

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    if (dto.reminderType) reminder.reminderType = dto.reminderType;
    if (dto.dueDate) reminder.dueDate = new Date(dto.dueDate);
    if (dto.status) reminder.status = dto.status;
    if (dto.notes !== undefined) reminder.notes = dto.notes;

    const saved = await this.reminderRepo.save(reminder);
    return { data: saved };
  }
}
