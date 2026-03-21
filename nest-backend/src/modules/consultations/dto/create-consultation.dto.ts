import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsBoolean,
  IsUUID,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateConsultationDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsUUID()
  clinicalRecordId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  duration?: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  status?:
    | 'draft'
    | 'scheduled'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'no_show'
    | 'signed'
    | 'locked';

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  confirmed?: boolean;

  @IsOptional()
  @IsString()
  appointment_reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  files?: Record<string, unknown>[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  active?: boolean;
}
