import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PoliciesService } from '../../policies/policies.service';
import { TimeService } from './time.service';

import { ShiftDto as PolicyShiftDto, ShiftSelectionPolicy } from '../../policies/dto/shifts-policy.dto';

@Injectable()
export class ShiftSelectionService {
    private readonly logger = new Logger(ShiftSelectionService.name);

    constructor(
        private prisma: PrismaService,
        private policiesService: PoliciesService,
        private timeService: TimeService,
    ) { }

    /**
     * Get effective shift for employee on a specific date
     * This is the single source of truth for shift selection
     */
    async getEffectiveShift(
        employeeId: string,
        eventTime?: Date,
        timezone?: string,
    ): Promise<PolicyShiftDto | null> {
        try {
            // Use unified policy resolution
            const effectivePolicy = await this.policiesService.getEffectivePolicy(employeeId);

            if (!effectivePolicy || !effectivePolicy.shifts) {
                return null;
            }

            const { list, defaultShiftId, selectionPolicy } = effectivePolicy.shifts;

            if (!list || list.length === 0) {
                return null;
            }

            // 1. If only one shift, return it
            if (list.length === 1) {
                return list[0];
            }

            // 2. If selection policy is FIXED, return default shift
            if (selectionPolicy === ShiftSelectionPolicy.FIXED && defaultShiftId) {
                return list.find(s => s.id === (defaultShiftId as any)) || (list[0] as any);
            }

            // 3. Otherwise (CLOSEST_START_TIME or no policy), find shift closest to event time OR current time
            const referenceTime = eventTime || new Date();

            // Use timezone aware hours/minutes if timezone is provided
            let refH: number;
            let refM: number;

            if (timezone) {
                const zonedDate = this.timeService.getZonedTime(referenceTime, timezone);
                refH = zonedDate.getHours();
                refM = zonedDate.getMinutes();
            } else {
                refH = referenceTime.getHours();
                refM = referenceTime.getMinutes();
            }

            const refTotal = refH * 60 + refM;

            let closestShift = list[0];
            let minDiff = Infinity;

            for (const shift of list) {
                const [h, m] = shift.startTime.split(':').map(Number);
                const shiftTotal = h * 60 + m;

                let diff = Math.abs(refTotal - shiftTotal);
                // Handle wrap-around diffs (e.g. 23:00 to 01:00)
                if (diff > 720) diff = 1440 - diff;

                if (diff < minDiff) {
                    minDiff = diff;
                    closestShift = shift;
                }
            }

            return closestShift;
        } catch (error) {
            this.logger.error(`Error selecting effective shift: ${error.message}`);
            return null;
        }
    }
}
