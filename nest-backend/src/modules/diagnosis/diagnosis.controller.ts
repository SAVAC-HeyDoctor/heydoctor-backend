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
import { DiagnosisService } from './diagnosis.service';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { UpdateDiagnosisDto } from './dto/update-diagnosis.dto';
import { DiagnosisFiltersDto } from './dto/diagnosis-filters.dto';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';

@Controller('diagnosis')
export class DiagnosisController {
  constructor(private readonly diagnosisService: DiagnosisService) {}

  @Get()
  async findAll(
    @ClinicId() clinicId: string,
    @Query() filters: DiagnosisFiltersDto,
  ) {
    return this.diagnosisService.findAll(clinicId, filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @ClinicId() clinicId: string) {
    return this.diagnosisService.findOne(id, clinicId);
  }

  @Post()
  async create(
    @ClinicId() clinicId: string,
    @Body() dto: CreateDiagnosisDto,
  ) {
    return this.diagnosisService.create(dto, clinicId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @ClinicId() clinicId: string,
    @Body() dto: UpdateDiagnosisDto,
  ) {
    return this.diagnosisService.update(id, dto, clinicId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @ClinicId() clinicId: string) {
    return this.diagnosisService.remove(id, clinicId);
  }
}
