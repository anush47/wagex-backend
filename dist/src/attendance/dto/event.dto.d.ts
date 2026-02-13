import { EventType } from '@prisma/client';
export declare class CreateEventDto {
    employeeId?: string;
    employeeNo?: number;
    eventTime: string;
    eventType?: EventType;
    device?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    remark?: string;
}
export declare class BulkCreateEventsDto {
    events: CreateEventDto[];
}
export declare class EventResponseDto {
    id: string;
    employeeNo: number;
    employeeName: string;
    eventTime: string;
    eventType: EventType;
    shiftName: string | null;
    status: string;
}
export declare class BulkEventResultDto {
    employeeNo: number;
    status: 'success' | 'failed';
    eventId?: string;
    error?: string;
}
export declare class BulkEventResponseDto {
    success: boolean;
    inserted: number;
    failed: number;
    results: BulkEventResultDto[];
}
