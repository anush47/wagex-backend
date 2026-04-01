import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  defaultStatutoryPaymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statutoryBankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statutoryBankBranch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statutoryBankCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statutoryBranchCode?: string;
}
