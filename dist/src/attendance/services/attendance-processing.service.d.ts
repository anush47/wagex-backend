import { PrismaService } from '../../prisma/prisma.service';
import { ShiftSelectionService } from './shift-selection.service';
import { AttendanceCalculationService } from './attendance-calculation.service';
import { LeaveIntegrationService } from './leave-integration.service';
import { AttendanceSession } from '@prisma/client';
export declare class AttendanceProcessingService {
    private readonly prisma;
    private readonly shiftService;
    private readonly calculationService;
    private readonly leaveService;
    private readonly logger;
    constructor(prisma: PrismaService, shiftService: ShiftSelectionService, calculationService: AttendanceCalculationService, leaveService: LeaveIntegrationService);
    processEmployeeDate(employeeId: string, date: Date): Promise<AttendanceSession | null>;
    private getEventsForDate;
    private createOrUpdateSession;
    processDateRange(companyId: string, startDate: Date, endDate: Date): Promise<void>;
}
