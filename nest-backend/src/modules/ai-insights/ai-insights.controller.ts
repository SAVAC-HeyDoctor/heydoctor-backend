import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AiInsightsService } from './ai-insights.service';
import { GenerateInsightsDto } from './dto/generate-insights.dto';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthActor } from '../../common/interfaces/auth-actor.interface';
import { Audit } from '../audit-log/decorators/audit.decorator';
import { AuditActions } from '../audit-log/audit-log.constants';

@Controller('ai-insights')
export class AiInsightsController {
  constructor(private readonly aiInsightsService: AiInsightsService) {}

  private actor(userId: string, clinicId: string): AuthActor {
    return { userId, clinicId };
  }

  @Get('patient/:patientId')
  async getByPatient(
    @Param('patientId') patientId: string,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.aiInsightsService.getByPatient(
      patientId,
      clinicId,
      isNaN(limitNum) ? 10 : Math.min(limitNum, 50),
      this.actor(userId, clinicId),
    );
  }

  @Audit({
    action: AuditActions.AI_INSIGHT_GENERATE,
    resourceType: 'ai_insight',
    patientIdBodyKey: 'patientId',
    consultationIdBodyKey: 'consultationId',
    resourceIdFromResponse: true,
  })
  @Post('generate')
  async generate(
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: GenerateInsightsDto,
  ) {
    return this.aiInsightsService.generate(
      dto,
      clinicId,
      this.actor(userId, clinicId),
    );
  }
}
