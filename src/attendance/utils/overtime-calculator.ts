import { SessionWorkDayStatus } from '@prisma/client';
import { OvertimeDayType } from '../../policies/dto/payroll-settings-policy.dto';

export interface OvertimeRule {
    id: string;
    name: string;
    dayStatus: OvertimeDayType;
    isHoliday?: boolean | null;
    holidayTypes?: string[];
    otEnabled: boolean;
    startAfterMinutes: number;
    tiers: { thresholdMinutes: number; multiplier: number }[];
    affectTotalEarnings?: boolean;
}

export interface OvertimeResult {
    hours: number;
    amount: number;
    type: 'NONE' | 'NORMAL' | 'DOUBLE' | 'TRIPLE';
    matchedRule?: OvertimeRule;
}

/**
 * Map session.workDayStatus (DB) to OvertimeDayType (Policy)
 */
export function mapWorkDayStatusToOvertimeType(workDayStatus: SessionWorkDayStatus): OvertimeDayType {
    switch (workDayStatus) {
        case SessionWorkDayStatus.FULL:
            return OvertimeDayType.WORKING_DAY;
        case SessionWorkDayStatus.HALF_FIRST:
        case SessionWorkDayStatus.HALF_LAST:
            return OvertimeDayType.HALF_DAY;
        case SessionWorkDayStatus.OFF:
            return OvertimeDayType.OFF_DAY;
        default:
            return OvertimeDayType.ANY;
    }
}

/**
 * Find matching OT rule for a session
 */
export function findMatchingOvertimeRule(
    workDayStatus: SessionWorkDayStatus,
    isHoliday: boolean,
    holidayFlags: string[],
    otRules: OvertimeRule[]
): OvertimeRule | null {
    const mappedStatus = mapWorkDayStatusToOvertimeType(workDayStatus);

    for (const rule of otRules) {
        // For holiday rules, match based on holiday type, not work day status
        // For non-holiday rules, match based on work day status
        let statusMatch = true;
        if (rule.isHoliday) {
            // Holiday rules match any work day status (FULL/HALF/OFF) when on a holiday
            statusMatch = isHoliday;
        } else {
            // Non-holiday rules match based on work day status
            statusMatch = rule.dayStatus === OvertimeDayType.ANY || rule.dayStatus === mappedStatus;
        }

        let holidayMatch = true;
        if (rule.isHoliday !== undefined && rule.isHoliday !== null) {
            if (rule.isHoliday !== isHoliday) {
                holidayMatch = false;
            } else if (isHoliday && rule.holidayTypes && rule.holidayTypes.length > 0) {
                // Check if ANY of the rule's required types match the holiday's flags
                const typeMatch = rule.holidayTypes.some(t => holidayFlags.includes(t));
                if (!typeMatch) holidayMatch = false;
            }
        }

        if (statusMatch && holidayMatch) {
            return rule;
        }
    }

    return null;
}

/**
 * Calculate policy-based overtime minutes
 */
export function calculatePolicyOvertimeMinutes(
    workMinutes: number,
    workDayStatus: SessionWorkDayStatus,
    isHoliday: boolean,
    holidayFlags: string[],
    otRules: OvertimeRule[]
): number {
    const matchedRule = findMatchingOvertimeRule(workDayStatus, isHoliday, holidayFlags, otRules);

    if (matchedRule && matchedRule.otEnabled) {
        return Math.max(0, workMinutes - (matchedRule.startAfterMinutes || 0));
    }

    return 0;
}

/**
 * Calculate OT amount with tiered rates
 */
export function calculateOvertimeAmount(
    workMinutes: number,
    hourlyRate: number,
    rule: OvertimeRule
): { hours: number; amount: number; type: 'NONE' | 'NORMAL' | 'DOUBLE' | 'TRIPLE' } {
    if (!rule.otEnabled) {
        return { hours: 0, amount: 0, type: 'NONE' };
    }

    const eligibleMinutes = Math.max(0, workMinutes - rule.startAfterMinutes);
    if (eligibleMinutes <= 0) {
        return { hours: 0, amount: 0, type: 'NONE' };
    }

    let totalOtAmount = 0;
    const sortedTiers = [...rule.tiers].sort((a, b) => a.thresholdMinutes - b.thresholdMinutes);

    for (let i = 0; i < sortedTiers.length; i++) {
        const tier = sortedTiers[i];
        const nextTier = sortedTiers[i + 1];

        const tierStartInRule = tier.thresholdMinutes;
        const tierEndInRule = nextTier ? nextTier.thresholdMinutes : Infinity;

        // How much of the eligible OT falls into this tier window?
        const segmentStart = Math.max(0, tierStartInRule);
        const segmentEnd = Math.min(eligibleMinutes, tierEndInRule);

        if (segmentEnd > segmentStart) {
            const minutesInTier = segmentEnd - segmentStart;
            totalOtAmount += (minutesInTier / 60) * hourlyRate * tier.multiplier;
        }
    }

    // Determine OT type based on multiplier
    let type: 'NONE' | 'NORMAL' | 'DOUBLE' | 'TRIPLE' = 'NORMAL';
    const baseMultiplier = sortedTiers[0]?.multiplier || 1;
    if (baseMultiplier >= 2.5) type = 'TRIPLE';
    else if (baseMultiplier >= 1.5) type = 'DOUBLE';
    else type = 'NORMAL';

    return {
        hours: eligibleMinutes / 60,
        amount: totalOtAmount,
        type,
    };
}

/**
 * Full OT calculation for salary engine
 */
export function calculateOvertimeForSession(
    workMinutes: number,
    workDayStatus: SessionWorkDayStatus,
    isHoliday: boolean,
    holidayFlags: string[],
    hourlyRate: number,
    otRules: OvertimeRule[]
): OvertimeResult {
    const matchedRule = findMatchingOvertimeRule(workDayStatus, isHoliday, holidayFlags, otRules);

    if (!matchedRule || !matchedRule.otEnabled) {
        return { hours: 0, amount: 0, type: 'NONE' };
    }

    const otResult = calculateOvertimeAmount(workMinutes, hourlyRate, matchedRule);
    return {
        ...otResult,
        matchedRule,
    };
}
