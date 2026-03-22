import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @Min(1, { message: 'amount must be a positive integer (e.g. CLP)' })
  amount: number;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  consultationId?: string;
}
