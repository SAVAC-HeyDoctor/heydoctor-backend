import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { DiagnosisService } from './diagnosis.service';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { UpdateDiagnosisDto } from './dto/update-diagnosis.dto';

@Controller('diagnosis')
export class DiagnosisController {
  constructor(private readonly diagnosisService: DiagnosisService) {}

  @Get('by-consultation/:consultationId')
  async findByConsultation(@Param('consultationId') consultationId: string) {
    return this.diagnosisService.findByConsultation(consultationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.diagnosisService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateDiagnosisDto) {
    return this.diagnosisService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDiagnosisDto,
  ) {
    return this.diagnosisService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.diagnosisService.remove(id);
  }
}
