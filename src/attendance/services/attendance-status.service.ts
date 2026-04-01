import { Injectable } from '@nestjs/common';
import { LeaveRequest } from '@prisma/client';
import { ShiftDto } from '../../policies/dto/shifts-policy.dto';
import { TimeService } from './time.service';

export interface StatusFlags {
  isLate: boolean;
  lateMinutes: number;
  isEarlyLeave: boolean;
  earlyLeaveMinutes: number;
  isOnLeave: boolean;
  isHalfDay: boolean;
  hasShortLeave: boolean;
}

@Injectable()
export class AttendanceStatusService {
  constructor(private readonly timeService: TimeService) {}

  /**
   * Calculate status flags based on times and shift rules
   */
  calculateStatusFlags(
    checkInTime: Date | null,
    checkOutTime: Date | null,
    shift: ShiftDto | null,
    leaves: LeaveRequest[] = [],
    timezone: string = 'UTC',
    referenceDate?: Date | null,
  ): StatusFlags {
    const flags: StatusFlags = {
      isLate: false,
      lateMinutes: 0,
      isEarlyLeave: false,
      earlyLeaveMinutes: 0,
      isOnLeave: false,
      isHalfDay: false,
      hasShortLeave: false,
    };

    // Check leave status
    if (leaves.length > 0) {
      flags.isOnLeave = leaves.some((l) => l.type === 'FULL_DAY');
      flags.isHalfDay = leaves.some((l) => l.type === 'HALF_DAY_FIRST' || l.type === 'HALF_DAY_LAST');
      flags.hasShortLeave = leaves.some((l) => l.type === 'SHORT_LEAVE');
    }

    // If no shift or no check-in, can't determine late/early
    if (!shift || !checkInTime) {
      return flags;
    }

    const graceMinutes = shift.gracePeriodLate || 0;

    // Use referenceDate for parsing shift times (logical day)
    // If not provided, fallback to checkInTime
    const refDate = referenceDate || checkInTime;

    // Check if late
    const shiftStartTime = this.timeService.parseTimeWithTimezone(shift.startTime, refDate, timezone);
    const lateDiff = Math.max(0, Math.floor((checkInTime.getTime() - shiftStartTime.getTime()) / (1000 * 60)));

    flags.lateMinutes = lateDiff;
    flags.isLate = lateDiff > graceMinutes;

    // Check if early leave
    if (checkOutTime) {
      const shiftEndTime = this.timeService.parseTimeWithTimezone(shift.endTime, refDate, timezone);

      // Handle cross-day shift end time (e.g. 10 PM to 7 AM)
      if (shiftEndTime < shiftStartTime) {
        shiftEndTime.setDate(shiftEndTime.getDate() + 1);
      }

      const earlyDiff = Math.max(0, Math.floor((shiftEndTime.getTime() - checkOutTime.getTime()) / (1000 * 60)));
      flags.earlyLeaveMinutes = earlyDiff;
      flags.isEarlyLeave = earlyDiff > graceMinutes;
    }

    return flags;
  }
}
