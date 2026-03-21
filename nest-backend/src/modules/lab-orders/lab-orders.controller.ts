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
  async findAll(
    @ClinicId() clinicId: string,
    @Query() filters: LabOrderFiltersDto,
  ) {
    return this.labOrdersService.findAll(clinicId, filters);
  }

  @Get('patient/:patientId')
  async getByPatient(
    @Param('patientId') patientId: string,
    @ClinicId() clinicId: string,
  ) {
    return this.labOrdersService.getByPatient(patientId, clinicId);
  }

  @Get('suggest-tests')
  async suggestTests(@Query('q') q: string) {
    return this.labOrdersService.suggestTests(q || '');
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @ClinicId() clinicId: string) {
    return this.labOrdersService.findOne(id, clinicId);
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
    if (!doctor) {
      throw new ForbiddenException('Doctor not found for this clinic');
    }
    return this.labOrdersService.create(clinicId, doctor.id, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @ClinicId() clinicId: string,
    @Body() dto: UpdateLabOrderDto,
  ) {
    return this.labOrdersService.update(id, dto, clinicId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @ClinicId() clinicId: string) {
    return this.labOrdersService.remove(id, clinicId);
  }
}
