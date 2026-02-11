import { PrismaService } from '../../prisma/prisma.service';
import { ShiftSelectionService } from './shift-selection.service';
import { AttendanceCalculationService } from './attendance-calculation.service';
import { LeaveIntegrationService } from './leave-integration.service';
import { AttendanceSession } from '@prisma/client';
import { PoliciesService } from '../../policies/policies.service';
import { SessionGroupingService } from './session-grouping.service';
export declare class AttendanceProcessingService {
    private readonly prisma;
    private readonly shiftService;
    private readonly calculationService;
    private readonly leaveService;
    private readonly policiesService;
    private readonly sessionGroupingService;
    private readonly logger;
    constructor(prisma: PrismaService, shiftService: ShiftSelectionService, calculationService: AttendanceCalculationService, leaveService: LeaveIntegrationService, policiesService: PoliciesService, sessionGroupingService: SessionGroupingService);
    processEmployeeDate(employeeId: string, date: Date): Promise<AttendanceSession[]>;
    private createOrUpdateSessionFromGroup;
    processDateRange(companyId: string, startDate: Date, endDate: Date): Promise<void>;
}
