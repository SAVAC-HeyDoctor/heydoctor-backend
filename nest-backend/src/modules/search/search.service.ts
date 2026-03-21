import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient, Doctor, Cie10Code } from '../../entities';
import { requireClinicId } from '../../common/utils/clinic-scope.util';
import { AuthorizationService } from '../../common/services/authorization.service';
import type { AuthActor } from '../../common/interfaces/auth-actor.interface';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Cie10Code)
    private readonly cie10Repo: Repository<Cie10Code>,
    private readonly authz: AuthorizationService,
  ) {}

  async search(
    q: string,
    type: 'patient' | 'doctor' | 'diagnostic' | undefined,
    actor: AuthActor,
  ) {
    const cid = requireClinicId(actor.clinicId);
    await this.authz.resolveDoctorForUser(actor.userId, cid);

    const term = (q || '').trim();
    if (!term) {
      return { data: { patients: [], doctors: [], diagnostics: [] } };
    }

    const searchPattern = `%${term}%`;

    const results: {
      patients: Patient[];
      doctors: Doctor[];
      diagnostics: Cie10Code[];
    } = {
      patients: [],
      doctors: [],
      diagnostics: [],
    };

    if (!type || type === 'patient') {
      const qb = this.patientRepo
        .createQueryBuilder('p')
        .where(
          '(p.firstname ILIKE :term OR p.lastname ILIKE :term OR p.identification ILIKE :term)',
          { term: searchPattern },
        );
      qb.andWhere('p.clinicId = :clinicId', { clinicId: cid });
      results.patients = await qb.take(20).getMany();
    }

    if (!type || type === 'doctor') {
      const qb = this.doctorRepo
        .createQueryBuilder('d')
        .leftJoinAndSelect('d.user', 'u')
        .where(
          '(u.firstName ILIKE :term OR u.lastName ILIKE :term OR u.email ILIKE :term OR d.speciality ILIKE :term)',
          { term: searchPattern },
        );
      qb.andWhere('d.clinicId = :clinicId', { clinicId: cid });
      results.doctors = await qb.take(20).getMany();
    }

    if (!type || type === 'diagnostic') {
      results.diagnostics = await this.cie10Repo
        .createQueryBuilder('c')
        .where('c.code ILIKE :term OR c.description ILIKE :term', {
          term: searchPattern,
        })
        .take(20)
        .getMany();
    }

    return { data: results };
  }
}
