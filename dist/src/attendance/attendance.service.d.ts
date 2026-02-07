import { PrismaService } from '../prisma/prisma.service';
import { AttendanceProcessingService } from './services/attendance-processing.service';
import { CreateEventDto, BulkCreateEventsDto } from './dto/event.dto';
import { UpdateSessionDto, SessionQueryDto, EventQueryDto } from './dto/session.dto';
import { EventSource, AttendanceEvent, AttendanceSession } from '@prisma/client';
export declare class AttendanceService {
    private readonly prisma;
    private readonly processingService;
    private readonly logger;
    constructor(prisma: PrismaService, processingService: AttendanceProcessingService);
    createManualEvent(dto: CreateEventDto, source?: EventSource): Promise<AttendanceEvent>;
    createExternalEvent(dto: CreateEventDto, companyId: string, apiKeyName: string): Promise<AttendanceEvent>;
    bulkCreateExternalEvents(dto: BulkCreateEventsDto, companyId: string, apiKeyName: string): Promise<{
        success: boolean;
        inserted: number;
        failed: number;
        results: {
            employeeNo: number;
            status: "success" | "failed";
            eventId?: string;
            error?: string;
        }[];
    }>;
    getSessions(query: SessionQueryDto): Promise<{
        items: ({
            employee: {
                employeeNo: number;
                nameWithInitials: string;
                fullName: string;
            };
        } & {
            checkInTime: Date | null;
            checkOutTime: Date | null;
            shiftId: string | null;
            isLate: boolean;
            isEarlyLeave: boolean;
            isOnLeave: boolean;
            isHalfDay: boolean;
            hasShortLeave: boolean;
            remarks: string | null;
            totalMinutes: number | null;
            breakMinutes: number | null;
            workMinutes: number | null;
            overtimeMinutes: number | null;
            companyId: string;
            employeeId: string;
            id: string;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
            date: Date;
            shiftName: string | null;
            shiftStartTime: string | null;
            shiftEndTime: string | null;
            shiftBreakMinutes: number | null;
            checkInLocation: string | null;
            checkInLatitude: number | null;
            checkInLongitude: number | null;
            checkOutLocation: string | null;
            checkOutLatitude: number | null;
            checkOutLongitude: number | null;
            manuallyEdited: boolean;
            autoCheckout: boolean;
            inApprovalStatus: import("@prisma/client").$Enums.ApprovalStatus;
            outApprovalStatus: import("@prisma/client").$Enums.ApprovalStatus;
            approvedById: string | null;
            approvedAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    getEvents(query: EventQueryDto): Promise<{
        items: ({
            employee: {
                employeeNo: number;
                nameWithInitials: string;
                fullName: string;
            };
        } & {
            companyId: string;
            employeeId: string;
            id: string;
            eventTime: Date;
            eventType: import("@prisma/client").$Enums.EventType;
            source: import("@prisma/client").$Enums.EventSource;
            apiKeyName: string | null;
            device: string | null;
            location: string | null;
            latitude: number | null;
            longitude: number | null;
            status: import("@prisma/client").$Enums.EventStatus;
            sessionId: string | null;
            manualOverride: boolean;
            remark: string | null;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    updateSession(id: string, dto: UpdateSessionDto): Promise<AttendanceSession>;
    deleteSession(id: string): Promise<{
        message: string;
    }>;
    verifyApiKey(apiKey: string): Promise<{
        valid: boolean;
        company?: any;
        apiKey?: any;
    }>;
}
