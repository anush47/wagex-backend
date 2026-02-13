import { PrismaService } from '../prisma/prisma.service';
import { PoliciesService } from '../policies/policies.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { LeaveStatus } from './enums/leave.enum';
import { LeaveRequest } from '@prisma/client';
export declare class LeavesService {
    private readonly prisma;
    private readonly policiesService;
    private readonly logger;
    constructor(prisma: PrismaService, policiesService: PoliciesService);
    getBalances(employeeId: string, currentDate?: Date): Promise<{
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
    createRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
    updateRequest(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest>;
    deleteRequest(id: string): Promise<{
        message: string;
    }>;
    findAll(companyId: string, filters?: {
        status?: LeaveStatus;
        employeeId?: string;
    }): Promise<({
        employee: {
            id: string;
            employeeNo: number;
            nameWithInitials: string;
            fullName: string;
            photo: string | null;
        };
    } & {
        type: import("@prisma/client").$Enums.LeaveRequestType;
        companyId: string;
        employeeId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.LeaveStatus;
        managerId: string | null;
        leaveTypeId: string;
        leaveTypeName: string | null;
        startDate: Date;
        endDate: Date;
        days: number;
        minutes: number | null;
        leaveNumber: number | null;
        reason: string | null;
        responseReason: string | null;
        documents: import("@prisma/client/runtime/client").JsonValue | null;
        holidayId: string | null;
    })[]>;
    findOne(id: string): Promise<LeaveRequest>;
    private calculatePeriod;
    private calculateEntitlement;
    private calculateUsage;
    private calculatePending;
    private calculateLeaveNumber;
    private calculateDuration;
    private calculateEarnedLeave;
}
