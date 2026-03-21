import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from '../../entities';
import { requireClinicId } from '../../common/utils/clinic-scope.util';
import { AuthorizationService } from '../../common/services/authorization.service';
import type { AuthActor } from '../../common/interfaces/auth-actor.interface';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepo: Repository<Template>,
    private readonly authz: AuthorizationService,
  ) {}

  async findAll(clinicId: string | undefined | null, actor: AuthActor) {
    const cid = requireClinicId(clinicId);
    await this.authz.resolveDoctorForUser(actor.userId, cid);
    const items = await this.templateRepo.find({
      where: { clinicId: cid },
      order: { name: 'ASC' },
    });
    return { data: items };
  }

  async create(
    clinicId: string | undefined | null,
    dto: { name: string; content?: string; type?: string },
    actor: AuthActor,
  ) {
    const cid = requireClinicId(clinicId);
    await this.authz.resolveDoctorForUser(actor.userId, cid);
    const template = this.templateRepo.create({
      clinicId: cid,
      ...dto,
    });
    const saved = await this.templateRepo.save(template);
    return { data: saved };
  }

  async update(
    id: string,
    clinicId: string | undefined | null,
    dto: { name?: string; content?: string; type?: string },
    actor: AuthActor,
  ) {
    const cid = requireClinicId(clinicId);
    await this.authz.resolveDoctorForUser(actor.userId, cid);
    const template = await this.templateRepo.findOne({
      where: { id, clinicId: cid },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    Object.assign(template, dto);
    const saved = await this.templateRepo.save(template);
    return { data: saved };
  }

  async delete(
    id: string,
    clinicId: string | undefined | null,
    actor: AuthActor,
  ) {
    const cid = requireClinicId(clinicId);
    await this.authz.resolveDoctorForUser(actor.userId, cid);
    const result = await this.templateRepo.delete({ id, clinicId: cid });
    if (result.affected === 0) {
      throw new NotFoundException('Template not found');
    }
    return { data: { success: true } };
  }
}
