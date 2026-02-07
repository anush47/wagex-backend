import { PrismaService } from '../prisma/prisma.service';
import { AttendanceProcessingService } from './services/attendance-processing.service';
import { PoliciesService } from '../policies/policies.service';
import { CreateEventDto, BulkCreateEventsDto } from './dto/event.dto';
import { UpdateSessionDto, SessionQueryDto, EventQueryDto } from './dto/session.dto';
import { EventSource, AttendanceEvent, AttendanceSession } from '@prisma/client';
export declare class AttendanceService {
    private readonly prisma;
    private readonly processingService;
    private readonly policiesService;
    private readonly logger;
    constructor(prisma: PrismaService, processingService: AttendanceProcessingService, policiesService: PoliciesService);
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
                photo: string | null;
            };
        } & {
            id: string;
            employeeId: string;
            companyId: string;
            date: Date;
            shiftId: string | null;
            shiftName: string | null;
            shiftStartTime: string | null;
            shiftEndTime: string | null;
            shiftBreakMinutes: number | null;
            checkInTime: Date | null;
            checkOutTime: Date | null;
            checkInLocation: string | null;
            checkInLatitude: number | null;
            checkInLongitude: number | null;
            checkOutLocation: string | null;
            checkOutLatitude: number | null;
            checkOutLongitude: number | null;
            totalMinutes: number | null;
            breakMinutes: number | null;
            workMinutes: number | null;
            overtimeMinutes: number | null;
            isLate: boolean;
            isEarlyLeave: boolean;
            isOnLeave: boolean;
            isHalfDay: boolean;
            hasShortLeave: boolean;
            manuallyEdited: boolean;
            autoCheckout: boolean;
            workDayStatus: import("@prisma/client").$Enums.SessionWorkDayStatus;
            inApprovalStatus: import("@prisma/client").$Enums.ApprovalStatus;
            outApprovalStatus: import("@prisma/client").$Enums.ApprovalStatus;
            approvedById: string | null;
            approvedAt: Date | null;
            remarks: string | null;
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
    getSession(id: string): Promise<AttendanceSession>;
    getEvents(query: EventQueryDto): Promise<{
        items: ({
            employee: {
                employeeNo: number;
                nameWithInitials: string;
                fullName: string;
                photo: string | null;
            };
        } & {
            id: string;
            employeeId: string;
            companyId: string;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.EventStatus;
            remark: string | null;
            eventTime: Date;
            eventType: import("@prisma/client").$Enums.EventType;
            source: import("@prisma/client").$Enums.EventSource;
            apiKeyName: string | null;
            device: string | null;
            location: string | null;
            latitude: number | null;
            longitude: number | null;
            sessionId: string | null;
            manualOverride: boolean;
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
