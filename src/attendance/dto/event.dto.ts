import { IsEnum, IsOptional, IsString, IsNumber, IsBoolean, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType, EventSource } from '@prisma/client';

export class CreateEventDto {
    @ApiPropertyOptional({ description: 'Employee ID (for manual/web entries)' })
    @IsOptional()
    @IsUUID()
    employeeId?: string;

    @ApiPropertyOptional({ description: 'Employee number (for API key entries)' })
    @IsOptional()
    @IsNumber()
    employeeNo?: number;

    @ApiProperty({ description: 'Event timestamp in ISO format', example: '2026-02-07T08:30:00Z' })
    @IsDateString()
    eventTime: string;

    @ApiProperty({ enum: EventType, description: 'Event type: IN or OUT' })
    @IsEnum(EventType)
    eventType: EventType;

    @ApiPropertyOptional({ description: 'Device name/identifier' })
    @IsOptional()
    @IsString()
    device?: string;

    @ApiPropertyOptional({ description: 'Location description' })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({ description: 'Latitude coordinate' })
    @IsOptional()
    @IsNumber()
    latitude?: number;

    @ApiPropertyOptional({ description: 'Longitude coordinate' })
    @IsOptional()
    @IsNumber()
    longitude?: number;

    @ApiPropertyOptional({ description: 'Additional remarks' })
    @IsOptional()
    @IsString()
    remark?: string;
}

export class BulkCreateEventsDto {
    @ApiProperty({ type: [CreateEventDto], description: 'Array of events to insert' })
    events: CreateEventDto[];
}

export class EventResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    employeeNo: number;

    @ApiProperty()
    employeeName: string;

    @ApiProperty()
    eventTime: string;

    @ApiProperty({ enum: EventType })
    eventType: EventType;

    @ApiProperty()
    shiftName: string | null;

    @ApiProperty()
    status: string;
}

export class BulkEventResultDto {
    @ApiProperty()
    employeeNo: number;

    @ApiProperty()
    status: 'success' | 'failed';

    @ApiProperty()
    eventId?: string;

    @ApiProperty()
    error?: string;
}

export class BulkEventResponseDto {
    @ApiProperty()
    success: boolean;

    @ApiProperty()
    inserted: number;

    @ApiProperty()
    failed: number;

    @ApiProperty({ type: [BulkEventResultDto] })
    results: BulkEventResultDto[];
}
