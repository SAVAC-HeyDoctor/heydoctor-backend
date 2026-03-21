import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('doctor-adoption')
  async getDoctorAdoption(
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
    @Query('days') days: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.service.getDoctorAdoption(
      { userId, clinicId },
      isNaN(daysNum) ? 30 : daysNum,
    );
  }
}
