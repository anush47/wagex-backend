// wagex-backend/src/billing/dto/billing.dto.ts
import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, IsEnum, Min, Max } from 'class-validator';
import { SuspensionLevel } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class UpdateBillingConfigDto {
  @IsOptional() @IsNumber() basePriceLkr?: number;
  @IsOptional() @IsArray() employeeTiers?: any[];
  @IsOptional() @IsArray() services?: any[];
  @IsOptional() @IsArray() multiMonthDiscounts?: any[];
  @IsOptional() @IsBoolean() overrideActive?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Max(24) gracePeriodMonths?: number;
  @IsOptional() @IsEnum(SuspensionLevel) suspensionLevel?: SuspensionLevel;
  @IsOptional() @IsString() notes?: string;
}

export class CreateInvoicesDto {
  @IsString() companyId: string;
  @IsArray() @IsString({ each: true }) billingPeriods: string[];
}

export class UploadSlipDto {
  @IsArray() @IsString({ each: true }) invoiceIds: string[];
}

export class ReviewInvoiceDto {
  @IsArray() @IsString({ each: true }) invoiceIds: string[];
  @IsBoolean() approved: boolean;
  @IsOptional() @IsString() rejectionReason?: string;
}

export class ForceRecalculateDto {
  @IsString() companyId: string;
}

export class GetInvoicesQueryDto extends PaginationDto {
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() period?: string;
}

export class GetCompaniesQueryDto extends PaginationDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() search?: string;
}
