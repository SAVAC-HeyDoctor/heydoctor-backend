import { Controller, Post, Body } from '@nestjs/common';
import { CdssService } from './cdss.service';
import { CdssEvaluateDto } from './dto/evaluate.dto';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CLINICAL_AI_DISCLAIMER } from '../../common/constants/clinical-ai-disclaimer';

@Controller('cdss')
export class CdssController {
  constructor(private readonly cdssService: CdssService) {}

  @Post('evaluate')
  async evaluate(
    @Body() dto: CdssEvaluateDto,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const result = await this.cdssService.evaluate(dto, { userId, clinicId });
    return { ...result, disclaimer: CLINICAL_AI_DISCLAIMER };
  }
}
