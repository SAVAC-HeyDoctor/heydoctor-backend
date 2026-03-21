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

export class CreateDiagnosisDto {
  @IsUUID()
  consultationId: string;

  @IsOptional()
  @IsUUID()
  clinicalRecordId?: string;

  /** ICD/CIE-10 code (string). */
  @IsOptional()
  @IsString()
  code?: string;

  /** CIE10 catalog reference. */
  @IsOptional()
  @IsUUID()
  cie10CodeId?: string;

  /** Clinical description of the diagnosis. */
  @IsOptional()
  @IsString()
  diagnosis_details?: string;

  /** Short description. */
  @IsOptional()
  @IsString()
  description?: string;

  /** Clinician notes. */
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  diagnostic_date?: string;

  @IsOptional()
  @IsString()
  type?: string;

  /** AI enrichment data. */
  @IsOptional()
  @ValidateNested()
  @Type(() => AiEnrichmentDto)
  ai_enrichment?: AiEnrichmentDto;
}
