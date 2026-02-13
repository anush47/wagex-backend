import { IsNumber, IsString, IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
    @ApiProperty({ example: 'company-uuid' })
    @IsUUID()
    companyId: string;

    @ApiPropertyOptional({ example: 'salary-uuid' })
    @IsOptional()
    @IsUUID()
    salaryId?: string;

    @ApiPropertyOptional({ example: 'advance-uuid' })
    @IsOptional()
    @IsUUID()
    advanceId?: string;

    @ApiProperty({ example: 10000 })
    @IsNumber()
    amount: number;

    @ApiProperty({ example: '2024-01-25' })
    @IsDateString()
    date: string;

    @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.BANK_TRANSFER })
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @ApiPropertyOptional({ example: 'TXN-123456' })
    @IsOptional()
    @IsString()
    referenceNo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    remarks?: string;
}
