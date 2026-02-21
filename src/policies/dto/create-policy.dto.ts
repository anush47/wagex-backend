import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { PolicySettingsDto } from './policy-settings.dto';

export class CreatePolicyDto {
    @ApiProperty({ description: 'Policy configuration settings' })
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => PolicySettingsDto)
    settings: PolicySettingsDto;

    @ApiProperty({ example: 'Night Shift', description: 'Policy Name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ description: 'Policy Description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ default: false, description: 'Mark as company default' })
    @IsOptional()
    isDefault?: boolean;

    @ApiProperty({ example: 'uuid', description: 'Company ID' })
    @IsNotEmpty()
    @IsUUID()
    companyId: string;
}
