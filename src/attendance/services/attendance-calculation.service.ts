import { Injectable, Logger } from '@nestjs/common';
import { AttendanceEvent, EventType, SessionWorkDayStatus, LeaveRequest } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionGroup } from './session-grouping.service';
import { ShiftDto } from '../../policies/dto/shifts-policy.dto';
import { calculatePolicyOvertimeMinutes, OvertimeRule } from '../utils/overtime-calculator';
import { ProcessingContext } from '../types/processing-context.types';
import { AttendanceWorkTimeService, WorkTimeResult } from './attendance-work-time.service';
import { AttendanceStatusService, StatusFlags } from './attendance-status.service';
import { AttendanceHolidayService } from './attendance-holiday.service';
import { PolicySettingsDto } from '../../policies/dto/policy-settings.dto';

export interface AttendanceCalculationResult extends WorkTimeResult, StatusFlags {
  policyOvertimeMinutes?: number;
}

@Injectable()
export class AttendanceCalculationService {
  private readonly logger = new Logger(AttendanceCalculationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workTimeService: AttendanceWorkTimeService,
    private readonly statusService: AttendanceStatusService,
    private readonly holidayService: AttendanceHolidayService,
  ) {}

  /**
   * Centralized calculation function for both auto and manual attendance
   */
  async calculate(
    data: {
      events?: AttendanceEvent[];
      sessionGroup?: SessionGroup;
      checkInTime?: Date | null;
      checkOutTime?: Date | null;
      shiftBreakMinutes?: number | null;
      date?: Date | null;
    },
    shift: ShiftDto | null,
    leaves: LeaveRequest[] = [],
    timezone: string = 'UTC',
    policy?: PolicySettingsDto,
    context?: ProcessingContext,
  ): Promise<AttendanceCalculationResult> {
    // Use context data if available
    const effectiveShift = context?.shift || shift;
    const effectiveLeaves = (context?.leaves as unknown as LeaveRequest[]) || leaves;
    const effectiveTimezone = context?.timezone || timezone;
    const effectivePolicy = context?.policy || policy;

    let workTime: WorkTimeResult;

    if (data.sessionGroup) {
      workTime = this.workTimeService.calculateWorkTimeFromSessionGroup(
        data.sessionGroup,
        effectiveShift,
        effectiveTimezone,
      );
    } else if (data.events && data.events.length > 0) {
      workTime = this.workTimeService.calculateWorkTime(data.events, effectiveShift, effectiveTimezone);
    } else {
      workTime = this.workTimeService.calculateManualWorkTime(
        data.checkInTime || null,
        data.checkOutTime || null,
        data.shiftBreakMinutes ?? effectiveShift?.breakTime ?? 0,
        effectiveShift,
        effectiveTimezone,
      );
    }

    // Determine check-in and check-out times for status flags
    let checkInTime: Date | null = null;
    let checkOutTime: Date | null = null;

    if (data.sessionGroup) {
      checkInTime = data.sessionGroup.firstIn;
      checkOutTime = data.sessionGroup.lastOut;
    } else {
      checkInTime = data.checkInTime || (data.events ? this.getFirstIn(data.events) : null);
      checkOutTime = data.checkOutTime || (data.events ? this.getLastOut(data.events) : null);
    }

    const flags = this.statusService.calculateStatusFlags(
      checkInTime,
      checkOutTime,
      effectiveShift,
      effectiveLeaves,
      effectiveTimezone,
      data.sessionGroup?.sessionDate || data.date,
    );

    let policyOvertimeMinutes = workTime.overtimeMinutes;
    let workHolidayId: string | null = null;
    let payrollHolidayId: string | null = null;
    let workDayStatus: SessionWorkDayStatus = SessionWorkDayStatus.FULL;

    if (effectivePolicy) {
      const sessionDate = data.sessionGroup?.sessionDate || data.date || new Date();
      workDayStatus = this.holidayService.determineWorkDayStatus(sessionDate, effectivePolicy);

      const workCalendarId =
        effectivePolicy.workingDays?.workingCalendar ||
        effectivePolicy.attendance?.calendarId ||
        effectivePolicy.calendarId;
      const payrollCalendarId =
        effectivePolicy.workingDays?.payrollCalendar ||
        effectivePolicy.payrollConfiguration?.calendarId ||
        effectivePolicy.calendarId;

      const holidays = await this.holidayService.resolveHolidays(
        sessionDate,
        workCalendarId,
        payrollCalendarId,
        context,
      );
      workHolidayId = holidays.workHolidayId;
      payrollHolidayId = holidays.payrollHolidayId;

      const holidayFlags: string[] = [];

      if (context?.holidays) {
        const dayStart = new Date(sessionDate).setUTCHours(0, 0, 0, 0);
        const matchingHoliday = context.holidays.find(
          (h) =>
            (h.calendarId === workCalendarId || h.calendarId === payrollCalendarId) &&
            new Date(h.date).setUTCHours(0, 0, 0, 0) === dayStart,
        );
        if (matchingHoliday) {
          if (matchingHoliday.isPublic) holidayFlags.push('PUBLIC');
          if (matchingHoliday.isMercantile) holidayFlags.push('MERCANTILE');
          if (matchingHoliday.isBank) holidayFlags.push('BANK');
        }
      } else {
        const holidayId = workHolidayId || payrollHolidayId;
        if (holidayId) {
          const holiday = await this.prisma.holiday.findUnique({
            where: { id: holidayId },
          });
          if (holiday) {
            if (holiday.isPublic) holidayFlags.push('PUBLIC');
            if (holiday.isMercantile) holidayFlags.push('MERCANTILE');
            if (holiday.isBank) holidayFlags.push('BANK');
          }
        }
      }

      policyOvertimeMinutes = this.calculatePolicyOvertimeMinutes(
        workTime.workMinutes,
        workDayStatus,
        !!(workHolidayId || payrollHolidayId),
        holidayFlags,
        effectivePolicy,
      );
    }

    return {
      ...workTime,
      ...flags,
      overtimeMinutes: policyOvertimeMinutes,
      policyOvertimeMinutes,
    };
  }

  private calculatePolicyOvertimeMinutes(
    workMinutes: number,
    workDayStatus: SessionWorkDayStatus,
    isHoliday: boolean,
    holidayFlags: string[],
    policy: PolicySettingsDto,
  ): number {
    const payrollConfig = policy.payrollConfiguration;
    const otRules = (payrollConfig?.otRules as unknown as OvertimeRule[]) || [];

    return calculatePolicyOvertimeMinutes(workMinutes, workDayStatus, isHoliday, holidayFlags, otRules);
  }

  private getFirstIn(events: AttendanceEvent[]): Date | null {
    return events.find((e) => e.eventType === EventType.IN)?.eventTime || null;
  }

  private getLastOut(events: AttendanceEvent[]): Date | null {
    return [...events].reverse().find((e) => e.eventType === EventType.OUT)?.eventTime || null;
  }
}
