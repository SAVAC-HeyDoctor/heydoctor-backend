import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsObject,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AiEnrichmentDto {
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsArray()
  suggested_codes?: Array<{ code: string; description?: string }>;

  @IsOptional()
  @IsObject()
  raw_response?: Record<string, unknown>;
}

export class UpdateDiagnosisDto {
  @IsOptional()
  @IsUUID()
  consultationId?: string;

  @IsOptional()
  @IsUUID()
  clinicalRecordId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsUUID()
  cie10CodeId?: string;

  @IsOptional()
  @IsString()
  diagnosis_details?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  diagnostic_date?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiEnrichmentDto)
  ai_enrichment?: AiEnrichmentDto;
}
