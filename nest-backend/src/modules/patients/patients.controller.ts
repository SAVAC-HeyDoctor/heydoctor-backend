import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { ClinicService } from '../clinic/clinic.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { PatientFiltersDto } from '../clinic/dto/patient-filters.dto';

@Controller('patients')
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly clinicService: ClinicService,
  ) {}

  @Get()
  async findAll(
    @ClinicId() clinicId: string,
    @Query() filters: PatientFiltersDto,
  ) {
    return this.patientsService.findAll(clinicId, filters);
  }

  @Get(':id/medical-record')
  async getMedicalRecord(
    @Param('id') patientId: string,
    @ClinicId() clinicId: string,
  ) {
    return this.clinicService.getPatientMedicalRecord(patientId, clinicId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @ClinicId() clinicId: string) {
    return this.patientsService.findOne(id, clinicId);
  }

  @Post()
  async create(
    @ClinicId() clinicId: string,
    @Body() dto: CreatePatientDto,
  ) {
    return this.patientsService.create(dto, clinicId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @ClinicId() clinicId: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(id, dto, clinicId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @ClinicId() clinicId: string) {
    return this.patientsService.remove(id, clinicId);
  }
}
