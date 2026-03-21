import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  firstname: string;

  @IsString()
  lastname: string;

  @IsString()
  identification: string;

  @IsOptional()
  @IsEnum(['passport', 'id card', 'rut'])
  identification_type?: 'passport' | 'id card' | 'rut';

  @IsDateString()
  birth_date: string;

  @IsOptional()
  @IsEnum(['M', 'F', 'Other'])
  gender?: 'M' | 'F' | 'Other';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  profile_picture?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
