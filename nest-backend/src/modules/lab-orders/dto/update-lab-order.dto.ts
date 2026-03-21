import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  IsIn,
} from 'class-validator';

export class UpdateLabOrderDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsUUID()
  consultationId?: string;

  @IsOptional()
  @IsUUID()
  diagnosisId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lab_tests?: string[];

  @IsOptional()
  @IsIn(['pending', 'ordered', 'in_progress', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsIn(['routine', 'urgent', 'asap', 'stat'])
  priority?: string;

  @IsOptional()
  @IsString()
  diagnosis_code?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
