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
  tiers: { thresholdMinutes: number; multiplier: number; affectTotalEarnings: boolean }[];
}

export interface OvertimeResult {
  hours: number;
  amount: number;
  hasOt: boolean;
  earningsAffectingAmount: number;
  earningsAffectingMinutes: number;
  nonEarningsAffectingAmount: number;
  nonEarningsAffectingMinutes: number;
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
  otRules: OvertimeRule[],
): OvertimeRule | null {
  const mappedStatus = mapWorkDayStatusToOvertimeType(workDayStatus);

  for (const rule of otRules) {
    let statusMatch = true;
    if (rule.isHoliday) {
      statusMatch = isHoliday;
    } else {
      statusMatch = rule.dayStatus === OvertimeDayType.ANY || rule.dayStatus === mappedStatus;
    }

    let holidayMatch = true;
    if (rule.isHoliday !== undefined && rule.isHoliday !== null) {
      if (rule.isHoliday !== isHoliday) {
        holidayMatch = false;
      } else if (isHoliday && rule.holidayTypes && rule.holidayTypes.length > 0) {
        const typeMatch = rule.holidayTypes.some((t) => holidayFlags.includes(t));
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
  otRules: OvertimeRule[],
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
  rule: OvertimeRule,
): { hours: number; amount: number; hasOt: boolean; earningsAffectingAmount: number; earningsAffectingMinutes: number; nonEarningsAffectingAmount: number; nonEarningsAffectingMinutes: number } {
  if (!rule.otEnabled) {
    return { hours: 0, amount: 0, hasOt: false, earningsAffectingAmount: 0, earningsAffectingMinutes: 0, nonEarningsAffectingAmount: 0, nonEarningsAffectingMinutes: 0 };
  }

  const eligibleMinutes = Math.max(0, workMinutes - rule.startAfterMinutes);
  if (eligibleMinutes <= 0) {
    return { hours: 0, amount: 0, hasOt: false, earningsAffectingAmount: 0, earningsAffectingMinutes: 0, nonEarningsAffectingAmount: 0, nonEarningsAffectingMinutes: 0 };
  }

  let totalOtAmount = 0;
  let earningsAffectingAmount = 0;
  let earningsAffectingMinutes = 0;
  let nonEarningsAffectingAmount = 0;
  let nonEarningsAffectingMinutes = 0;
  const sortedTiers = [...rule.tiers].sort((a, b) => a.thresholdMinutes - b.thresholdMinutes);

  for (let i = 0; i < sortedTiers.length; i++) {
    const tier = sortedTiers[i];
    const nextTier = sortedTiers[i + 1];

    const tierStartInRule = tier.thresholdMinutes;
    const tierEndInRule = nextTier ? nextTier.thresholdMinutes : Infinity;

    const segmentStart = Math.max(0, tierStartInRule);
    const segmentEnd = Math.min(eligibleMinutes, tierEndInRule);

    if (segmentEnd > segmentStart) {
      const minutesInTier = segmentEnd - segmentStart;
      const tierAmount = (minutesInTier / 60) * hourlyRate * tier.multiplier;
      totalOtAmount += tierAmount;
      if (tier.affectTotalEarnings) {
        earningsAffectingAmount += tierAmount;
        earningsAffectingMinutes += minutesInTier;
      } else {
        nonEarningsAffectingAmount += tierAmount;
        nonEarningsAffectingMinutes += minutesInTier;
      }
    }
  }

  return {
    hours: eligibleMinutes / 60,
    amount: totalOtAmount,
    hasOt: true,
    earningsAffectingAmount,
    earningsAffectingMinutes,
    nonEarningsAffectingAmount,
    nonEarningsAffectingMinutes,
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
  otRules: OvertimeRule[],
): OvertimeResult {
  const matchedRule = findMatchingOvertimeRule(workDayStatus, isHoliday, holidayFlags, otRules);

  if (!matchedRule || !matchedRule.otEnabled) {
    return { hours: 0, amount: 0, hasOt: false, earningsAffectingAmount: 0, earningsAffectingMinutes: 0, nonEarningsAffectingAmount: 0, nonEarningsAffectingMinutes: 0 };
  }

  const otResult = calculateOvertimeAmount(workMinutes, hourlyRate, matchedRule);
  return {
    ...otResult,
    matchedRule,
  };
}
