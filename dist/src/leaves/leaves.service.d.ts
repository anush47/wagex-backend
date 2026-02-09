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
            nameWithInitials: string;
            fullName: string;
            employeeNo: number;
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
        responseReason: string | null;
        leaveTypeName: string | null;
        days: number;
        minutes: number | null;
        leaveNumber: number | null;
    })[]>;
    findOne(id: string): Promise<LeaveRequest>;
    private calculatePeriod;
    private calculateEntitlement;
    private calculateUsage;
    private calculatePending;
    private calculateLeaveNumber;
    private calculateDuration;
}
