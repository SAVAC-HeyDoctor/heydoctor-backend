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
import type { AuthActor } from '../../common/interfaces/auth-actor.interface';

@Controller('lab-orders')
export class LabOrdersController {
  constructor(private readonly labOrdersService: LabOrdersService) {}

  private actor(userId: string, clinicId: string): AuthActor {
    return { userId, clinicId };
  }

  @Get()
  async findAll(
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
    @Query() filters: LabOrderFiltersDto,
  ) {
    return this.labOrdersService.findAll(
      clinicId,
      filters,
      this.actor(userId, clinicId),
    );
  }

  @Get('patient/:patientId')
  async getByPatient(
    @Param('patientId') patientId: string,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.labOrdersService.getByPatient(
      patientId,
      clinicId,
      this.actor(userId, clinicId),
    );
  }

  @Get('suggest-tests')
  async suggestTests(
    @Query('q') q: string,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.labOrdersService.suggestTests(
      q || '',
      this.actor(userId, clinicId),
    );
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.labOrdersService.findOne(
      id,
      clinicId,
      this.actor(userId, clinicId),
    );
  }

  @Post()
  async create(
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateLabOrderDto,
  ) {
    return this.labOrdersService.create(dto, this.actor(userId, clinicId));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateLabOrderDto,
  ) {
    return this.labOrdersService.update(
      id,
      dto,
      clinicId,
      this.actor(userId, clinicId),
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.labOrdersService.remove(
      id,
      clinicId,
      this.actor(userId, clinicId),
    );
  }
}
