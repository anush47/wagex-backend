import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
    @ApiProperty({ example: 'WageX Inc.', description: 'Name of the company' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: true, description: 'Is company active' })
    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
