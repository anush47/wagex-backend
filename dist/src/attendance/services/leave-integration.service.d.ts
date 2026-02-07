import { PrismaService } from '../../prisma/prisma.service';
interface LeaveRequest {
    id: string;
    type: string;
    startDate: Date;
    endDate: Date;
    days: number;
    minutes?: number;
}
export declare class LeaveIntegrationService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getApprovedLeaves(employeeId: string, date: Date): Promise<LeaveRequest[]>;
    hasFullDayLeave(employeeId: string, date: Date): Promise<boolean>;
    hasHalfDayLeave(employeeId: string, date: Date): Promise<boolean>;
    getShortLeaveMinutes(employeeId: string, date: Date): Promise<number>;
}
export {};
