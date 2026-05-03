import { Injectable } from '@nestjs/common';
import { PayrollCalculationMethod } from '../../policies/dto/payroll-settings-policy.dto';
import { calculateOvertimeForSession, OvertimeResult } from '../../attendance/utils/overtime-calculator';
import { AttendanceSession, Holiday } from '@prisma/client';

@Injectable()
export class SalaryOvertimeService {
  calculateOvertime(
    session: AttendanceSession & { payrollHoliday?: Holiday | null; workHoliday?: Holiday | null },
    hourlyRate: number,
    payrollConfig: any,
  ): OvertimeResult {
    if (!session.workMinutes || session.workMinutes <= 0) {
      return { hours: 0, amount: 0, type: 'NONE', earningsAffectingAmount: 0, nonEarningsAffectingAmount: 0 };
    }

    const calculationMethod = payrollConfig?.calculationMethod || PayrollCalculationMethod.FIXED_MONTHLY_SALARY;
    if (
      calculationMethod === PayrollCalculationMethod.SHIFT_ATTENDANCE_FLAT ||
      calculationMethod === PayrollCalculationMethod.DAILY_ATTENDANCE_FLAT
    ) {
      return { hours: 0, amount: 0, type: 'NONE', earningsAffectingAmount: 0, nonEarningsAffectingAmount: 0 };
    }

    const otRules = (payrollConfig?.otRules as any[]) || [];

    const isSessionOnHoliday = !!(session.workHolidayId || session.payrollHolidayId);
    const holiday = session.payrollHoliday || session.workHoliday;
    const holidayFlags: string[] = [];
    if (isSessionOnHoliday && holiday) {
      if (holiday.isPublic) holidayFlags.push('PUBLIC');
      if (holiday.isMercantile) holidayFlags.push('MERCANTILE');
      if (holiday.isBank) holidayFlags.push('BANK');
    }

    return calculateOvertimeForSession(
      session.workMinutes,
      session.workDayStatus as any,
      isSessionOnHoliday,
      holidayFlags,
      hourlyRate,
      otRules,
    );
  }
}
