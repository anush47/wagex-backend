import { IsString, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;
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
}
