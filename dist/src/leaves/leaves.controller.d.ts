import { LeavesService } from './leaves.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { LeaveStatus } from './enums/leave.enum';
export declare class LeavesController {
    private readonly leavesService;
    private readonly logger;
    constructor(leavesService: LeavesService);
    create(createLeaveRequestDto: CreateLeaveRequestDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        type: import("@prisma/client").$Enums.LeaveRequestType;
        status: import("@prisma/client").$Enums.LeaveStatus;
        managerId: string | null;
        employeeId: string;
        documents: import("@prisma/client/runtime/client").JsonValue | null;
        leaveTypeId: string;
        startDate: Date;
        endDate: Date;
        reason: string | null;
        holidayId: string | null;
        responseReason: string | null;
        leaveTypeName: string | null;
        days: number;
        minutes: number | null;
        leaveNumber: number | null;
    }>;
    getBalances(employeeId: string): Promise<{
        leaveTypeId: string;
        leaveTypeName: string;
        leaveTypeCode: string;
        entitled: number;
        used: number;
        pending: number;
        available: number;
        period: {
            start: Date;
            end: Date;
        };
    }[]>;
    findAll(companyId: string, status?: LeaveStatus, employeeId?: string): Promise<({
        employee: {
            id: string;
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
        type: import("@prisma/client").$Enums.LeaveRequestType;
        status: import("@prisma/client").$Enums.LeaveStatus;
        managerId: string | null;
        employeeId: string;
        documents: import("@prisma/client/runtime/client").JsonValue | null;
        leaveTypeId: string;
        startDate: Date;
        endDate: Date;
        reason: string | null;
        holidayId: string | null;
        responseReason: string | null;
        leaveTypeName: string | null;
        days: number;
        minutes: number | null;
        leaveNumber: number | null;
    })[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        type: import("@prisma/client").$Enums.LeaveRequestType;
        status: import("@prisma/client").$Enums.LeaveStatus;
        managerId: string | null;
        employeeId: string;
        documents: import("@prisma/client/runtime/client").JsonValue | null;
        leaveTypeId: string;
        startDate: Date;
        endDate: Date;
        reason: string | null;
        holidayId: string | null;
        responseReason: string | null;
        leaveTypeName: string | null;
        days: number;
        minutes: number | null;
        leaveNumber: number | null;
    }>;
    update(id: string, updateLeaveRequestDto: UpdateLeaveRequestDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        type: import("@prisma/client").$Enums.LeaveRequestType;
        status: import("@prisma/client").$Enums.LeaveStatus;
        managerId: string | null;
        employeeId: string;
        documents: import("@prisma/client/runtime/client").JsonValue | null;
        leaveTypeId: string;
        startDate: Date;
        endDate: Date;
        reason: string | null;
        holidayId: string | null;
        responseReason: string | null;
        leaveTypeName: string | null;
        days: number;
        minutes: number | null;
        leaveNumber: number | null;
    }>;
    delete(id: string): Promise<{
        message: string;
    }>;
}
