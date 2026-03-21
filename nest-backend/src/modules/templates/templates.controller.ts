import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ClinicId } from '../../common/decorators/clinic-id.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}

  @Get()
  async findAll(
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.service.findAll(clinicId, { userId, clinicId });
  }

  @Post()
  async create(
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.service.create(clinicId, dto, { userId, clinicId });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.service.update(id, clinicId, dto, { userId, clinicId });
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @ClinicId() clinicId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.service.delete(id, clinicId, { userId, clinicId });
  }
}
