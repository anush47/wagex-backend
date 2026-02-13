import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceProcessingService } from './attendance-processing.service';
import { CreateEventDto, BulkCreateEventsDto } from '../dto/event.dto';
import { AttendanceEvent } from '@prisma/client';
import { ShiftSelectionService } from './shift-selection.service';
export declare class AttendanceExternalService {
    private readonly prisma;
    private readonly processingService;
    private readonly shiftSelectionService;
    private readonly logger;
    constructor(prisma: PrismaService, processingService: AttendanceProcessingService, shiftSelectionService: ShiftSelectionService);
    private apiKeyCache;
    private readonly CACHE_TTL;
    verifyApiKey(apiKey: string): Promise<{
        valid: boolean;
        type?: 'COMPANY' | 'EMPLOYEE';
        company?: {
            id: string;
            name: string;
            employerNumber?: string;
        };
        employee?: {
            id: string;
            name: string;
            employeeNo: number;
        };
        apiKey?: {
            id: string;
            name: string;
            lastUsedAt: Date;
        };
    }>;
    private lastUpdateMap;
    private throttleLastUsedUpdate;
    createExternalEvent(dto: CreateEventDto, verification: {
        type: 'COMPANY' | 'EMPLOYEE';
        company: {
            id: string;
        };
        employee?: {
            id: string;
            name: string;
            employeeNo: number;
        };
        apiKey: {
            name: string;
        };
    }): Promise<AttendanceEvent & {
        employeeName: string;
        shiftName: string;
    }>;
    bulkCreateExternalEvents(dto: BulkCreateEventsDto, verification: {
        type: 'COMPANY' | 'EMPLOYEE';
        company: {
            id: string;
        };
        employee?: {
            id: string;
            name: string;
            employeeNo: number;
        };
        apiKey: {
            name: string;
        };
    }): Promise<{
        success: boolean;
        inserted: number;
        failed: number;
        results: any[];
    }>;
}
