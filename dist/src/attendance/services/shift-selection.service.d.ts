import { PrismaService } from '../../prisma/prisma.service';
interface ShiftDto {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakTime: number;
    gracePeriodLate?: number;
    autoClockOut?: boolean;
    maxOutTime?: string;
}
export declare class ShiftSelectionService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getEffectiveShift(employeeId: string, date: Date, eventTime?: Date): Promise<ShiftDto | null>;
    private selectShiftByPolicy;
    private findClosestShift;
    private mapShift;
}
export {};
