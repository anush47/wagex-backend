import { PrismaService } from '../../prisma/prisma.service';
import { SessionQueryDto, EventQueryDto } from '../dto/session.dto';
import { AttendanceSession } from '@prisma/client';
export declare class AttendanceQueryService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getSessions(query: SessionQueryDto): Promise<{
        items: ({
            employee: {
                employeeNo: number;
                nameWithInitials: string;
                fullName: string;
                photo: string | null;
            };
            workHoliday: {
                id: string;
                date: Date;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                calendarId: string;
                description: string | null;
                isPublic: boolean;
                isMercantile: boolean;
                isBank: boolean;
            } | null;
            payrollHoliday: {
                id: string;
                date: Date;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                calendarId: string;
                description: string | null;
                isPublic: boolean;
                isMercantile: boolean;
                isBank: boolean;
            } | null;
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
            additionalInOutCount: number | null;
            isBreakOverrideActive: boolean;
            workDayStatus: import("@prisma/client").$Enums.SessionWorkDayStatus;
            inApprovalStatus: import("@prisma/client").$Enums.ApprovalStatus;
            outApprovalStatus: import("@prisma/client").$Enums.ApprovalStatus;
            approvedById: string | null;
            approvedAt: Date | null;
            remarks: string | null;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            workHolidayId: string | null;
            payrollHolidayId: string | null;
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
    getSessionEvents(sessionId: string): Promise<({
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
    })[]>;
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
}
