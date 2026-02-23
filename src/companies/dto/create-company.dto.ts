import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsDateString, IsArray } from 'class-validator';

export class CreateCompanyDto {
    @ApiProperty({ example: 'WageX Inc.', description: 'Name of the company' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: true, description: 'Is company active' })
    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @ApiPropertyOptional({ example: 'EMP-001', description: 'Employer Number' })
    @IsOptional()
    @IsString()
    employerNumber?: string;

    @ApiPropertyOptional({ example: '123 Main St, City', description: 'Address' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ example: '2023-01-01T00:00:00Z', description: 'Date started' })
    @IsOptional()
    @IsDateString()
    startedDate?: string;

    @ApiPropertyOptional({ example: 'https://example.com/logo.png', description: 'Logo URL' })
    @IsOptional()
    @IsString()
    logo?: string;

    @ApiPropertyOptional({ example: 'Asia/Colombo', description: 'Company default timezone' })
    @IsOptional()
    @IsString()
    timezone?: string;

    @ApiPropertyOptional({ example: [{ key: 'doc1', name: 'Document 1', url: '...' }], description: 'Uploaded files' })
    @IsOptional()
    @IsArray()
    files?: any; // Keeping as any for flexibility with Json type, ideally create a DTO class for File structure
}
