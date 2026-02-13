import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceProcessingService } from './attendance-processing.service';
import { CreateEventDto, BulkCreateEventsDto } from '../dto/event.dto';
import { AttendanceEvent } from '@prisma/client';
export declare class AttendanceExternalService {
    private readonly prisma;
    private readonly processingService;
    private readonly logger;
    constructor(prisma: PrismaService, processingService: AttendanceProcessingService);
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
    createExternalEvent(dto: CreateEventDto, companyId: string, apiKeyName: string): Promise<AttendanceEvent>;
    bulkCreateExternalEvents(dto: BulkCreateEventsDto, companyId: string, apiKeyName: string): Promise<{
        success: boolean;
        inserted: number;
        failed: number;
        results: any[];
    }>;
}
