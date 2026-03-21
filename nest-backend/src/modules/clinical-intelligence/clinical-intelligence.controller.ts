import { Controller, Get, Query } from '@nestjs/common';
import { ClinicalIntelligenceService } from './clinical-intelligence.service';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CLINICAL_AI_DISCLAIMER } from '../../common/constants/clinical-ai-disclaimer';

@Controller('clinical-intelligence')
export class ClinicalIntelligenceController {
  constructor(private readonly service: ClinicalIntelligenceService) {}

  @Get('suggest')
  async suggest(
    @Query('symptoms') symptoms: string,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const result = await this.service.suggest(symptoms || '', {
      userId,
      clinicId,
    });
    return { ...result, disclaimer: CLINICAL_AI_DISCLAIMER };
  }
}
