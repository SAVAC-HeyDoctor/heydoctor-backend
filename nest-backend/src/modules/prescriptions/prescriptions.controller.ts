import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { PrescriptionFiltersDto } from './dto/prescription-filters.dto';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from '../../entities';

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  @Get()
  async findAll(
    @ClinicId() clinicId: string,
    @Query() filters: PrescriptionFiltersDto,
  ) {
    return this.prescriptionsService.findAll(clinicId, filters);
  }

  @Get('patient/:patientId')
  async getByPatient(
    @Param('patientId') patientId: string,
    @ClinicId() clinicId: string,
  ) {
    return this.prescriptionsService.getByPatient(patientId, clinicId);
  }

  @Get('suggest-medications')
  async suggestMedications(@Query('q') q: string) {
    return this.prescriptionsService.suggestMedications(q || '');
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @ClinicId() clinicId: string) {
    return this.prescriptionsService.findOne(id, clinicId);
  }

  @Post()
  async create(
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePrescriptionDto,
  ) {
    const doctor = await this.doctorRepo.findOne({
      where: { userId, clinicId },
    });
    if (!doctor) {
      throw new ForbiddenException('Doctor not found for this clinic');
    }
    return this.prescriptionsService.create(clinicId, doctor.id, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @ClinicId() clinicId: string,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    return this.prescriptionsService.update(id, dto, clinicId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @ClinicId() clinicId: string) {
    return this.prescriptionsService.remove(id, clinicId);
  }
}
