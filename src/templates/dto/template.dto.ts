import { IsString, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType, TemplateStatus } from '@prisma/client';

export class CreateTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiProperty()
  @IsString()
  html: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  css?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: any;

  @ApiPropertyOptional({ enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'])
  status?: TemplateStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  css?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'])
  status?: TemplateStatus;
}

export class TemplateQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'])
  status?: TemplateStatus;
}
