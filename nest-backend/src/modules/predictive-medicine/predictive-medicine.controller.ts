import { Controller, Post, Body } from '@nestjs/common';
import { PredictiveMedicineService } from './predictive-medicine.service';
import { PredictiveRiskDto } from './dto/risk.dto';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CLINICAL_AI_DISCLAIMER } from '../../common/constants/clinical-ai-disclaimer';

@Controller('predictive-medicine')
export class PredictiveMedicineController {
  constructor(private readonly service: PredictiveMedicineService) {}

  @Post('risk')
  async assessRisk(
    @Body() dto: PredictiveRiskDto,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const result = await this.service.assessRisk(dto, { userId, clinicId });
    return { ...result, disclaimer: CLINICAL_AI_DISCLAIMER };
  }
}
