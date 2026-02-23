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
    ): Promise<{ shift: PolicyShiftDto | null, dateOffset: number }> {
        try {
            // Use unified policy resolution
            const effectivePolicy = await this.policiesService.getEffectivePolicy(employeeId);

            if (!effectivePolicy || !effectivePolicy.shifts) {
                return { shift: null, dateOffset: 0 };
            }

            const { list, defaultShiftId, selectionPolicy } = effectivePolicy.shifts;

            if (!list || list.length === 0) {
                return { shift: null, dateOffset: 0 };
            }

            // 1. If only one shift, return it with 0 offset (unless we want to support single-shift offset too)
            // For now, even single shifts need off-set check if they cross midnight
            if (list.length === 1 && selectionPolicy === ShiftSelectionPolicy.FIXED) {
                // Return immediately for simple fixed single shift cases without complex logic
                // But wait, even a single night shift needs offset if someone clocks in at 12:30 AM
            }

            // 2. If selection policy is FIXED, return default shift
            if (selectionPolicy === ShiftSelectionPolicy.FIXED && defaultShiftId) {
                const shift = list.find(s => s.id === (defaultShiftId as any)) || (list[0] as any);
                // Still need to calculate offset for this fixed shift
                const offset = this.calculateDateOffset(eventTime || new Date(), shift.startTime, timezone);
                return { shift, dateOffset: offset };
            }

            // 3. Otherwise (CLOSEST_START_TIME or no policy), find shift closest to event time OR current time
            const referenceTime = eventTime || new Date();

            let closestShift = list[0];
            let minDiff = Infinity;
            let finalOffset = 0;

            for (const shift of list) {
                const { diff, wrapped } = this.calculateTimeDiff(referenceTime, shift.startTime, timezone);

                if (diff < minDiff) {
                    minDiff = diff;
                    closestShift = shift;

                    // Calculate offset if it wrapped
                    if (wrapped) {
                        const refTotal = this.getTotalMinutes(referenceTime, timezone);
                        const [shH, shM] = shift.startTime.split(':').map(Number);
                        const shiftTotal = shH * 60 + shM;

                        // If clocked in early morning (refTotal < 720) for a late night shift (shiftTotal > 720)
                        if (refTotal < shiftTotal) {
                            finalOffset = -1;
                        } else {
                            finalOffset = 1;
                        }
                    } else {
                        finalOffset = 0;
                    }
                }
            }

            return { shift: closestShift, dateOffset: finalOffset };
        } catch (error) {
            this.logger.error(`Error selecting effective shift: ${error.message}`);
            return { shift: null, dateOffset: 0 };
        }
    }

    private getTotalMinutes(date: Date, timezone?: string): number {
        if (timezone) {
            const zonedDate = this.timeService.getZonedTime(date, timezone);
            return zonedDate.getHours() * 60 + zonedDate.getMinutes();
        }
        return date.getHours() * 60 + date.getMinutes();
    }

    private calculateTimeDiff(referenceTime: Date, shiftStartTime: string, timezone?: string): { diff: number, wrapped: boolean } {
        const refTotal = this.getTotalMinutes(referenceTime, timezone);
        const [h, m] = shiftStartTime.split(':').map(Number);
        const shiftTotal = h * 60 + m;

        let diff = Math.abs(refTotal - shiftTotal);
        let wrapped = false;

        if (diff > 720) {
            diff = 1440 - diff;
            wrapped = true;
        }

        return { diff, wrapped };
    }

    private calculateDateOffset(referenceTime: Date, shiftStartTime: string, timezone?: string): number {
        const { wrapped } = this.calculateTimeDiff(referenceTime, shiftStartTime, timezone);
        if (!wrapped) return 0;

        const refTotal = this.getTotalMinutes(referenceTime, timezone);
        const [shH, shM] = shiftStartTime.split(':').map(Number);
        const shiftTotal = shH * 60 + shM;

        return refTotal < shiftTotal ? -1 : 1;
    }
}
