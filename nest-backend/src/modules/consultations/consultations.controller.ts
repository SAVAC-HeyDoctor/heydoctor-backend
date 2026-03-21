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
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { ConsultationFiltersDto } from './dto/consultation-filters.dto';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';

@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Get()
  async findAll(
    @ClinicId() clinicId: string,
    @Query() filters: ConsultationFiltersDto,
  ) {
    return this.consultationsService.findAll(clinicId, filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @ClinicId() clinicId: string) {
    return this.consultationsService.findOne(id, clinicId);
  }

  @Post()
  async create(
    @ClinicId() clinicId: string,
    @Body() dto: CreateConsultationDto,
  ) {
    return this.consultationsService.create(dto, clinicId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @ClinicId() clinicId: string,
    @Body() dto: UpdateConsultationDto,
  ) {
    return this.consultationsService.update(id, dto, clinicId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @ClinicId() clinicId: string) {
    return this.consultationsService.remove(id, clinicId);
  }
}
