import { Injectable } from '@nestjs/common';
import { AttendanceEvent, EventType } from '@prisma/client';
import { ShiftDto } from '../../policies/dto/shifts-policy.dto';
import { TimeService } from './time.service';
import { SessionGroup } from './session-grouping.service';

export interface WorkTimeResult {
  totalMinutes: number;
  breakMinutes: number;
  workMinutes: number;
  overtimeMinutes: number;
}

@Injectable()
export class AttendanceWorkTimeService {
  constructor(private readonly timeService: TimeService) {}

  /**
   * Calculate work time from explicit check-in/out times
   */
  calculateManualWorkTime(
    checkIn: Date | null,
    checkOut: Date | null,
    breakMinutes: number,
    shift: ShiftDto | null,
    timezone: string = 'UTC',
  ): WorkTimeResult {
    if (!checkIn || !checkOut) {
      return {
        totalMinutes: 0,
        breakMinutes: 0,
        workMinutes: 0,
        overtimeMinutes: 0,
      };
    }

    const totalMinutes = Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60)));
    const workMinutes = Math.max(0, totalMinutes - breakMinutes);

    let overtimeMinutes = 0;
    if (shift) {
      const shiftDurationMinutes = this.getShiftDurationMinutes(shift, timezone);
      overtimeMinutes = Math.max(0, workMinutes - shiftDurationMinutes);
    }

    return {
      totalMinutes,
      breakMinutes,
      workMinutes,
      overtimeMinutes,
    };
  }

  /**
   * Calculate work time from multiple IN/OUT pairs
   * Handles breaks automatically by calculating gaps between OUT and IN
   */
  calculateWorkTime(events: AttendanceEvent[], shift: ShiftDto | null, timezone: string = 'UTC'): WorkTimeResult {
    if (!events || events.length === 0) {
      return {
        totalMinutes: 0,
        breakMinutes: 0,
        workMinutes: 0,
        overtimeMinutes: 0,
      };
    }

    // Sort events by time
    const sortedEvents = [...events].sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());

    // Calculate breaks from multiple IN/OUT pairs
    const { totalMinutes, breakMinutes: calculatedBreakMinutes } = this.calculateBreaksFromEvents(sortedEvents);

    // Apply automatic break if total time > 6 hours and no break calculated yet
    let breakMinutes = calculatedBreakMinutes;
    if (breakMinutes === 0 && totalMinutes > 360 && shift?.breakTime) {
      breakMinutes = shift.breakTime;
    }

    // Work minutes = total - breaks
    const workMinutes = Math.max(0, totalMinutes - breakMinutes);

    // Calculate overtime if shift is defined
    let overtimeMinutes = 0;
    if (shift) {
      const shiftDurationMinutes = this.getShiftDurationMinutes(shift, timezone);
      overtimeMinutes = Math.max(0, workMinutes - shiftDurationMinutes);
    }

    return {
      totalMinutes,
      breakMinutes,
      workMinutes,
      overtimeMinutes,
    };
  }

  /**
   * Calculate work time from session group data (enhanced for multiple IN/OUT pairs)
   */
  calculateWorkTimeFromSessionGroup(
    sessionGroup: SessionGroup,
    shift: ShiftDto | null,
    timezone: string = 'UTC',
  ): WorkTimeResult {
    if (!sessionGroup.events || sessionGroup.events.length === 0) {
      return {
        totalMinutes: 0,
        breakMinutes: 0,
        workMinutes: 0,
        overtimeMinutes: 0,
      };
    }

    // Calculate total time from first IN to last OUT
    if (!sessionGroup.firstIn || !sessionGroup.lastOut) {
      return {
        totalMinutes: 0,
        breakMinutes: 0,
        workMinutes: 0,
        overtimeMinutes: 0,
      };
    }

    const totalMinutes = Math.max(
      0,
      Math.floor((sessionGroup.lastOut.getTime() - sessionGroup.firstIn.getTime()) / (1000 * 60)),
    );

    // Calculate breaks from additional IN/OUT pairs
    let breakMinutes = 0;
    for (const pair of sessionGroup.additionalInOutPairs) {
      const pairBreak = Math.floor((pair.out.getTime() - pair.in.getTime()) / (1000 * 60));
      breakMinutes += pairBreak;
    }

    // Apply shift break if no additional breaks were calculated and shift has break time
    if (breakMinutes === 0 && shift?.breakTime && totalMinutes > 360) {
      breakMinutes = shift.breakTime;
    }

    // Work minutes = total - breaks
    const workMinutes = Math.max(0, totalMinutes - breakMinutes);

    // Calculate overtime if shift is defined
    let overtimeMinutes = 0;
    if (shift) {
      const shiftDurationMinutes = this.getShiftDurationMinutes(shift, timezone);
      overtimeMinutes = Math.max(0, workMinutes - shiftDurationMinutes);
    }

    return {
      totalMinutes,
      breakMinutes,
      workMinutes,
      overtimeMinutes,
    };
  }

  /**
   * Calculate breaks from multiple IN/OUT event pairs
   * Example: IN 9:00, OUT 12:00, IN 13:00, OUT 17:00 = 1hr break
   */
  calculateBreaksFromEvents(events: AttendanceEvent[]): {
    totalMinutes: number;
    breakMinutes: number;
    pairs: Array<{ in: Date; out: Date }>;
  } {
    const pairs: Array<{ in: Date; out: Date }> = [];
    let totalMinutes = 0;
    let breakMinutes = 0;

    let lastOut: Date | null = null;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      if (event.eventType === EventType.IN) {
        // If we have a previous OUT, calculate break time
        if (lastOut) {
          const breakDuration = (event.eventTime.getTime() - lastOut.getTime()) / (1000 * 60);
          breakMinutes += breakDuration;
        }

        // Look for matching OUT
        const nextOut = events.slice(i + 1).find((e) => e.eventType === EventType.OUT);
        if (nextOut) {
          pairs.push({ in: event.eventTime, out: nextOut.eventTime });
          const duration = (nextOut.eventTime.getTime() - event.eventTime.getTime()) / (1000 * 60);
          totalMinutes += duration;
          lastOut = nextOut.eventTime;
        }
      }
    }

    return { totalMinutes, breakMinutes, pairs };
  }

  /**
   * Determine if auto-checkout should apply
   */
  shouldAutoCheckout(events: AttendanceEvent[], shift: ShiftDto | null, currentTime: Date): boolean {
    if (!shift || !shift.autoClockOut) {
      return false;
    }

    // Check if there's a single IN event without OUT
    const hasIn = events.some((e) => e.eventType === EventType.IN);
    const hasOut = events.some((e) => e.eventType === EventType.OUT);

    if (!hasIn || hasOut) {
      return false;
    }

    // Check if more than 12 hours have passed since check-in
    const firstIn = events.find((e) => e.eventType === EventType.IN);
    if (!firstIn) {
      return false;
    }

    const hoursSinceCheckIn = (currentTime.getTime() - firstIn.eventTime.getTime()) / (1000 * 60 * 60);

    return hoursSinceCheckIn > 12;
  }

  /**
   * Calculate auto-checkout time based on shift duration
   */
  calculateAutoCheckoutTime(checkInTime: Date, shift: ShiftDto, timezone: string = 'UTC'): Date {
    const shiftDurationMinutes = this.getShiftDurationMinutes(shift, timezone);
    return new Date(checkInTime.getTime() + shiftDurationMinutes * 60 * 1000);
  }

  /**
   * Get shift duration in minutes
   */
  getShiftDurationMinutes(shift: ShiftDto, timezone: string = 'UTC'): number {
    const referenceDate = new Date();
    const start = this.timeService.parseTimeWithTimezone(shift.startTime, referenceDate, timezone);
    const end = this.timeService.parseTimeWithTimezone(shift.endTime, referenceDate, timezone);

    let duration = (end.getTime() - start.getTime()) / (1000 * 60);

    // Handle overnight shifts
    if (duration < 0) {
      duration += 24 * 60;
    }

    return duration;
  }
}
