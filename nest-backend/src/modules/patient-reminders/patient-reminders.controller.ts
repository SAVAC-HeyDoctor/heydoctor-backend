import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { PatientRemindersService } from './patient-reminders.service';
import { CreatePatientReminderDto } from './dto/create-reminder.dto';
import { UpdatePatientReminderDto } from './dto/update-reminder.dto';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthActor } from '../../common/interfaces/auth-actor.interface';

@Controller('patient-reminders')
export class PatientRemindersController {
  constructor(private readonly service: PatientRemindersService) {}

  private actor(userId: string, clinicId: string): AuthActor {
    return { userId, clinicId };
  }

  @Get()
  async findAll(
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.service.findAll(
      clinicId,
      patientId,
      this.actor(userId, clinicId),
    );
  }

  @Post()
  async create(
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePatientReminderDto,
  ) {
    return this.service.create(clinicId, dto, this.actor(userId, clinicId));
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdatePatientReminderDto,
  ) {
    return this.service.update(
      id,
      clinicId,
      dto,
      this.actor(userId, clinicId),
    );
  }
}
