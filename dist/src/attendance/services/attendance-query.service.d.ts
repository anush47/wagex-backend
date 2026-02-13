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
                nameWithInitials: string;
                fullName: string;
                employeeNo: number;
                photo: string | null;
            };
            workHoliday: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                isPublic: boolean;
                description: string | null;
                name: string;
                calendarId: string;
                date: Date;
                isMercantile: boolean;
                isBank: boolean;
            } | null;
            payrollHoliday: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                isPublic: boolean;
                description: string | null;
                name: string;
                calendarId: string;
                date: Date;
                isMercantile: boolean;
                isBank: boolean;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            employeeId: string;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
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
            workHolidayId: string | null;
            payrollHolidayId: string | null;
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
            nameWithInitials: string;
            fullName: string;
            employeeNo: number;
            photo: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        status: import("@prisma/client").$Enums.EventStatus;
        remark: string | null;
        latitude: number | null;
        longitude: number | null;
        employeeId: string;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        eventTime: Date;
        eventType: import("@prisma/client").$Enums.EventType;
        source: import("@prisma/client").$Enums.EventSource;
        apiKeyName: string | null;
        device: string | null;
        location: string | null;
        sessionId: string | null;
        manualOverride: boolean;
    })[]>;
    getEvents(query: EventQueryDto): Promise<{
        items: ({
            employee: {
                nameWithInitials: string;
                fullName: string;
                employeeNo: number;
                photo: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            status: import("@prisma/client").$Enums.EventStatus;
            remark: string | null;
            latitude: number | null;
            longitude: number | null;
            employeeId: string;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            eventTime: Date;
            eventType: import("@prisma/client").$Enums.EventType;
            source: import("@prisma/client").$Enums.EventSource;
            apiKeyName: string | null;
            device: string | null;
            location: string | null;
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
