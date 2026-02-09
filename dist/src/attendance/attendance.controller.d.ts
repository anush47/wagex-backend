import { AttendanceService } from './attendance.service';
import { CreateEventDto, BulkCreateEventsDto } from './dto/event.dto';
import { UpdateSessionDto, SessionQueryDto, EventQueryDto } from './dto/session.dto';
export declare class AttendanceManualController {
    private readonly attendanceService;
    private readonly logger;
    constructor(attendanceService: AttendanceService);
    createEvent(createEventDto: CreateEventDto): Promise<{
        success: boolean;
        event: {
            id: string;
            employeeId: string;
            eventTime: string;
            eventType: import("@prisma/client").$Enums.EventType;
            status: import("@prisma/client").$Enums.EventStatus;
        };
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
    getSession(id: string): Promise<{
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
    }>;
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
    updateSession(id: string, updateSessionDto: UpdateSessionDto): Promise<{
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
    }>;
    deleteSession(id: string): Promise<{
        message: string;
    }>;
}
export declare class AttendanceExternalController {
    private readonly attendanceService;
    private readonly logger;
    constructor(attendanceService: AttendanceService);
    verifyApiKey(apiKey: string): Promise<{
        valid: boolean;
        company?: any;
        apiKey?: any;
    }>;
    createEvent(apiKey: string, createEventDto: CreateEventDto): Promise<{
        success: boolean;
        event: {
            id: string;
            employeeId: string;
            eventTime: string;
            eventType: import("@prisma/client").$Enums.EventType;
            status: import("@prisma/client").$Enums.EventStatus;
        };
    }>;
    bulkCreateEvents(apiKey: string, bulkCreateDto: BulkCreateEventsDto): Promise<{
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
}
