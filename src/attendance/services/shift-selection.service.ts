import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class ShiftSelectionService {
    private readonly logger = new Logger(ShiftSelectionService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get effective shift for employee on a specific date
     * This is the single source of truth for shift selection
     */
    async getEffectiveShift(
        employeeId: string,
        date: Date,
        eventTime?: Date,
    ): Promise<ShiftDto | null> {
        try {
            // 1. Get employee data (including policyId)
            const employee = await this.prisma.employee.findUnique({
                where: { id: employeeId },
                include: { policy: true },
            });

            if (!employee) {
                this.logger.warn(`Employee not found: ${employeeId}`);
                return null;
            }

            // 2. Check for assigned policy template override
            if (employee.policy?.settings) {
                const empSettings = employee.policy.settings as any;
                if (empSettings.shifts) {
                    return this.selectShiftByPolicy(empSettings.shifts, eventTime);
                }
            }

            // 3. Fallback to company default policy
            const defaultPolicy = await this.prisma.policy.findFirst({
                where: { companyId: employee.companyId, isDefault: true },
            });

            if (!defaultPolicy || !defaultPolicy.settings) {
                this.logger.warn(`No default policy found for company: ${employee.companyId}`);
                return null;
            }

            const settings = defaultPolicy.settings as any;
            const shiftsConfig = settings.shifts;

            if (!shiftsConfig) {
                return null;
            }

            return this.selectShiftByPolicy(shiftsConfig, eventTime);

            // 4. Apply company-wide shift selection
            return this.selectShiftByPolicy(shiftsConfig, eventTime);
        } catch (error) {
            this.logger.error(`Error getting effective shift: ${error.message}`);
            return null;
        }
    }

    /**
     * Select shift based on policy rules
     */
    private selectShiftByPolicy(
        shiftsConfig: any,
        eventTime?: Date,
    ): ShiftDto | null {
        const policy = shiftsConfig.shiftSelectionPolicy || 'FIXED';
        const shifts = shiftsConfig.list || shiftsConfig.shifts || [];
        const defaultShiftId = shiftsConfig.defaultShiftId;

        if (shifts.length === 0) {
            return null;
        }

        // If there's a defaultShiftId and we're in FIXED mode (or no eventTime), use it
        if (defaultShiftId && (policy === 'FIXED' || !eventTime)) {
            const defaultShift = shifts.find((s: any) => s.id === defaultShiftId);
            if (defaultShift) return this.mapShift(defaultShift);
        }

        switch (policy) {
            case 'FIXED':
                // Return default or first shift
                return this.mapShift(shifts[0]);

            case 'CLOSEST_START_TIME':
                if (!eventTime) {
                    return this.mapShift(shifts[0]);
                }
                return this.findClosestShift(shifts, eventTime);

            case 'MANUAL':
            case 'EMPLOYEE_ROSTER':
                // For now, return first shift
                // TODO: Implement roster lookup
                return this.mapShift(shifts[0]);

            default:
                return this.mapShift(shifts[0]);
        }
    }

    /**
     * Find shift with closest start time to event time
     */
    private findClosestShift(shifts: any[], eventTime: Date): ShiftDto | null {
        const eventHour = eventTime.getHours();
        const eventMinute = eventTime.getMinutes();
        const eventTotalMinutes = eventHour * 60 + eventMinute;

        let closestShift = shifts[0];
        let minDiff = Infinity;

        for (const shift of shifts) {
            const [startHour, startMinute] = shift.startTime.split(':').map(Number);
            const shiftTotalMinutes = startHour * 60 + startMinute;
            const diff = Math.abs(eventTotalMinutes - shiftTotalMinutes);

            if (diff < minDiff) {
                minDiff = diff;
                closestShift = shift;
            }
        }

        return this.mapShift(closestShift);
    }

    /**
     * Map shift from policy JSON to ShiftDto
     */
    private mapShift(shift: any): ShiftDto {
        return {
            id: shift.id,
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            breakTime: shift.breakTime || 0,
            gracePeriodLate: shift.gracePeriodLate || 0,
            autoClockOut: shift.autoClockOut || false,
            maxOutTime: shift.maxOutTime,
        };
    }
}
