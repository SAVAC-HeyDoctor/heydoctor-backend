import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { LabOrdersService } from './lab-orders.service';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { UpdateLabOrderDto } from './dto/update-lab-order.dto';
import { LabOrderFiltersDto } from './dto/lab-order-filters.dto';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from '../../entities';

@Controller('lab-orders')
export class LabOrdersController {
  constructor(
    private readonly labOrdersService: LabOrdersService,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  @Get()
  async findAll(@Query() filters: LabOrderFiltersDto) {
    return this.labOrdersService.findAll(filters);
  }

  @Get('patient/:patientId')
  async getByPatient(
    @Param('patientId') patientId: string,
    @ClinicId() clinicId: string,
  ) {
    if (!clinicId) {
      return { data: [] };
    }
    return this.labOrdersService.getByPatient(patientId, clinicId);
  }

  @Get('suggest-tests')
  async suggestTests(@Query('q') q: string) {
    return this.labOrdersService.suggestTests(q || '');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.labOrdersService.findOne(id);
  }

  @Post()
  async create(
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateLabOrderDto,
  ) {
    const doctor = await this.doctorRepo.findOne({
      where: { userId, clinicId },
    });
    if (!doctor || !clinicId) {
      return { data: null };
    }
    return this.labOrdersService.create(clinicId, doctor.id, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLabOrderDto,
  ) {
    return this.labOrdersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.labOrdersService.remove(id);
  }
}
