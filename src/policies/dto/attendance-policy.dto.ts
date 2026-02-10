import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GeofencingEnforcement {
    STRICT = 'STRICT',
    FLAG_ONLY = 'FLAG_ONLY',
    NONE = 'NONE'
}

export enum ApprovalPolicyMode {
    AUTO_APPROVE = 'AUTO_APPROVE',
    REQUIRE_APPROVAL_ALL = 'REQUIRE_APPROVAL_ALL',
    REQUIRE_APPROVAL_EXCEPTIONS = 'REQUIRE_APPROVAL_EXCEPTIONS'
}

export class GeoZoneDto {
    @ApiProperty({ example: 'zone-1' })
    @IsString()
    id: string;

    @ApiProperty({ example: 'Head Office' })
    @IsString()
    name: string;

    @ApiProperty()
    @IsNumber()
    latitude: number;

    @ApiProperty()
    @IsNumber()
    longitude: number;

    @ApiProperty({ example: 100, description: 'Radius in meters' })
    @IsNumber()
    radius: number;

    @ApiProperty({ example: '123 Main St' })
    @IsString()
    address: string;
}

export class GeofencingConfigDto {
    @ApiProperty()
    @IsBoolean()
    enabled: boolean;

    @ApiProperty({ enum: GeofencingEnforcement })
    @IsEnum(GeofencingEnforcement)
    enforcement: GeofencingEnforcement;

    @ApiProperty({ type: [GeoZoneDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GeoZoneDto)
    zones: GeoZoneDto[];
}

export class ExceptionTriggersDto {
    @ApiProperty()
    @IsBoolean()
    outsideZone: boolean;

    @ApiProperty()
    @IsBoolean()
    deviceMismatch: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    unrecognizedIp?: boolean;
}

export class ApprovalPolicyConfigDto {
    @ApiProperty({ enum: ApprovalPolicyMode })
    @IsEnum(ApprovalPolicyMode)
    mode: ApprovalPolicyMode;

    @ApiProperty({ type: ExceptionTriggersDto })
    @ValidateNested()
    @Type(() => ExceptionTriggersDto)
    exceptionTriggers: ExceptionTriggersDto;
}

export class CompanyApiKeyDto {
    @ApiProperty({ example: 'key-1' })
    @IsString()
    id: string;

    @ApiProperty({ example: 'Reception Kiosk' })
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    key: string;

    @ApiProperty()
    @IsString()
    createdAt: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    lastUsedAt?: string;
}

export class AttendanceConfigDto {
    @ApiProperty({ description: 'Allow employees to check in from their own devices' })
    @IsBoolean()
    allowSelfCheckIn: boolean;

    @ApiProperty({ description: 'Require GPS location for check-in' })
    @IsBoolean()
    requireLocation: boolean;

    @ApiProperty({ description: 'Capture device info (User-Agent, IP)' })
    @IsBoolean()
    requireDeviceInfo: boolean;

    @ApiProperty({ type: GeofencingConfigDto })
    @ValidateNested()
    @Type(() => GeofencingConfigDto)
    geofencing: GeofencingConfigDto;

    @ApiProperty({ type: ApprovalPolicyConfigDto })
    @ValidateNested()
    @Type(() => ApprovalPolicyConfigDto)
    approvalPolicy: ApprovalPolicyConfigDto;

    @ApiProperty({ type: [CompanyApiKeyDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CompanyApiKeyDto)
    apiKeys: CompanyApiKeyDto[];

    @ApiPropertyOptional({ example: 'uuid-calendar', description: 'Override Calendar ID for Attendance' })
    @IsOptional()
    @IsString()
    calendarId?: string;
}
