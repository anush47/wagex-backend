import { Injectable, Logger } from '@nestjs/common';
import { SessionWorkDayStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProcessingContext } from '../types/processing-context.types';
import { PolicySettingsDto } from '../../policies/dto/policy-settings.dto';
import { WorkDayType, HalfDayShift } from '../../policies/dto/working-days-policy.dto';

@Injectable()
export class AttendanceHolidayService {
  private readonly logger = new Logger(AttendanceHolidayService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Determine Work Day Status from policy pattern
   */
  determineWorkDayStatus(date: Date, policy: PolicySettingsDto): SessionWorkDayStatus {
    const workingDaysConfig = policy?.workingDays;
    let workDayStatus: SessionWorkDayStatus = SessionWorkDayStatus.FULL;

    if (workingDaysConfig?.defaultPattern) {
      const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
      const dayOfWeek = dayNames[date.getDay()];
      const dayConfig = workingDaysConfig.defaultPattern[dayOfWeek];

      if (dayConfig) {
        const typeStr = String(dayConfig.type);
        if (typeStr === String(WorkDayType.OFF)) {
          workDayStatus = SessionWorkDayStatus.OFF;
        } else if (typeStr === String(WorkDayType.HALF)) {
          workDayStatus =
            String(dayConfig.halfDayShift) === String(HalfDayShift.LAST)
              ? SessionWorkDayStatus.HALF_LAST
              : SessionWorkDayStatus.HALF_FIRST;
        }
      }
    }
    return workDayStatus;
  }

  /**
   * Resolve holidays for a specific date and calendars
   */
  async resolveHolidays(
    date: Date,
    workCalendarId?: string | null,
    payrollCalendarId?: string | null,
    context?: ProcessingContext,
  ): Promise<{ workHolidayId: string | null; payrollHolidayId: string | null }> {
    let workHolidayId: string | null = null;
    let payrollHolidayId: string | null = null;

    // Optimization: Check context first
    if (context?.holidays) {
      const dayStart = new Date(date).setUTCHours(0, 0, 0, 0);
      const matchingHolidays = context.holidays.filter((h) => new Date(h.date).setUTCHours(0, 0, 0, 0) === dayStart);

      if (workCalendarId) {
        const wh = matchingHolidays.find((h) => h.calendarId === workCalendarId);
        if (wh) workHolidayId = wh.id;
      }
      if (payrollCalendarId) {
        const ph = matchingHolidays.find((h) => h.calendarId === payrollCalendarId);
        if (ph) payrollHolidayId = ph.id;
      }
      return { workHolidayId, payrollHolidayId };
    }

    if (!workCalendarId && !payrollCalendarId) {
      return { workHolidayId, payrollHolidayId };
    }

    if (workCalendarId === payrollCalendarId && workCalendarId) {
      const holiday = await this.findHoliday(date, workCalendarId, 'JOINT');
      if (holiday) {
        workHolidayId = holiday.id;
        payrollHolidayId = holiday.id;
      }
    } else {
      const [workHoliday, payrollHoliday] = await Promise.all([
        workCalendarId ? this.findHoliday(date, workCalendarId, 'WORK') : Promise.resolve(null),
        payrollCalendarId ? this.findHoliday(date, payrollCalendarId, 'PAYROLL') : Promise.resolve(null),
      ]);

      if (workHoliday) workHolidayId = workHoliday.id;
      if (payrollHoliday) payrollHolidayId = payrollHoliday.id;
    }

    return { workHolidayId, payrollHolidayId };
  }

  private async findHoliday(date: Date, calendarId: string, type: string) {
    if (!calendarId) return null;

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const holiday = await this.prisma.holiday.findFirst({
      where: {
        calendarId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { id: true, name: true },
    });

    if (holiday) {
      this.logger.log(
        `[ATTENDANCE_LOGIC] ✅ Found ${type} Holiday: ${holiday.name} on ${date.toISOString().split('T')[0]}`,
      );
    } else {
      this.logger.log(
        `[ATTENDANCE_LOGIC] ❌ No ${type} Holiday on ${date.toISOString().split('T')[0]} in calendar ${calendarId}`,
      );
    }
    return holiday;
  }
}
