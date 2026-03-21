import { Controller, Get, Param } from '@nestjs/common';
import { ClinicalInsightService } from './clinical-insight.service';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthActor } from '../../common/interfaces/auth-actor.interface';

@Controller('clinical-insight')
export class ClinicalInsightController {
  constructor(private readonly service: ClinicalInsightService) {}

  @Get('patient/:id')
  async getPatientInsight(
    @Param('id') patientId: string,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const actor: AuthActor = { userId, clinicId };
    return this.service.getPatientInsight(patientId, clinicId, actor);
  }
}
