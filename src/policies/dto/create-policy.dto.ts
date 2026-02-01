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

    @ApiPropertyOptional({ example: 'uuid', description: 'Company ID (if creating default policy)' })
    @IsOptional()
    @IsUUID()
    companyId?: string;

    @ApiPropertyOptional({ example: 'uuid', description: 'Employee ID (if creating override policy)' })
    @IsOptional()
    @IsUUID()
    employeeId?: string;
}
