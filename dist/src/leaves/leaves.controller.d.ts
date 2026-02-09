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
        employeeId: string;
        companyId: string;
        leaveTypeId: string;
        leaveTypeName: string | null;
        type: import("@prisma/client").$Enums.LeaveRequestType;
        startDate: Date;
        endDate: Date;
        days: number;
        minutes: number | null;
        leaveNumber: number | null;
        status: import("@prisma/client").$Enums.LeaveStatus;
        reason: string | null;
        managerId: string | null;
        responseReason: string | null;
        documents: import("@prisma/client/runtime/client").JsonValue | null;
        holidayId: string | null;
        createdAt: Date;
        updatedAt: Date;
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
            employeeNo: number;
            nameWithInitials: string;
            fullName: string;
            photo: string | null;
        };
    } & {
        id: string;
        employeeId: string;
        companyId: string;
        leaveTypeId: string;
        leaveTypeName: string | null;
        type: import("@prisma/client").$Enums.LeaveRequestType;
        startDate: Date;
        endDate: Date;
        days: number;
        minutes: number | null;
        leaveNumber: number | null;
        status: import("@prisma/client").$Enums.LeaveStatus;
        reason: string | null;
        managerId: string | null;
        responseReason: string | null;
        documents: import("@prisma/client/runtime/client").JsonValue | null;
        holidayId: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    findOne(id: string): Promise<{
        id: string;
        employeeId: string;
        companyId: string;
        leaveTypeId: string;
        leaveTypeName: string | null;
        type: import("@prisma/client").$Enums.LeaveRequestType;
        startDate: Date;
        endDate: Date;
        days: number;
        minutes: number | null;
        leaveNumber: number | null;
        status: import("@prisma/client").$Enums.LeaveStatus;
        reason: string | null;
        managerId: string | null;
        responseReason: string | null;
        documents: import("@prisma/client/runtime/client").JsonValue | null;
        holidayId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, updateLeaveRequestDto: UpdateLeaveRequestDto): Promise<{
        id: string;
        employeeId: string;
        companyId: string;
        leaveTypeId: string;
        leaveTypeName: string | null;
        type: import("@prisma/client").$Enums.LeaveRequestType;
        startDate: Date;
        endDate: Date;
        days: number;
        minutes: number | null;
        leaveNumber: number | null;
        status: import("@prisma/client").$Enums.LeaveStatus;
        reason: string | null;
        managerId: string | null;
        responseReason: string | null;
        documents: import("@prisma/client/runtime/client").JsonValue | null;
        holidayId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(id: string): Promise<{
        message: string;
    }>;
}
