import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PoliciesService } from '../../policies/policies.service';
import { AttendanceProcessingService } from '../../attendance/services/attendance-processing.service';
import { AdvancesService } from '../../advances/advances.service';
import { PayCycleFrequency, PayrollCalculationMethod } from '../../policies/dto/payroll-settings-policy.dto';
import { PolicySettingsDto } from '../../policies/dto/policy-settings.dto';
import { SalaryStatus, LeaveStatus, Prisma, AttendanceSession, Holiday } from '@prisma/client';
import { groupBy } from 'lodash';
import { SalaryValidationService, PayrollProblem } from './salary-validation.service';
import { SalaryOvertimeService } from './salary-overtime.service';
import { SalaryComponentService } from './salary-component.service';
import { SalaryPreview, SalaryGroupPreview } from '../interfaces/salary-calculation.interface';
import { LeaveTypeDto } from '../../policies/dto/leaves-policy.dto';

interface ExtendedAttendanceSession extends AttendanceSession {
  payrollHoliday?: Holiday | null;
  workHoliday?: Holiday | null;
}

@Injectable()
export class SalaryEngineService {
  private readonly logger = new Logger(SalaryEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policiesService: PoliciesService,
    private readonly attendanceService: AttendanceProcessingService,
    private readonly advancesService: AdvancesService,
    private readonly validationService: SalaryValidationService,
    private readonly overtimeService: SalaryOvertimeService,
    private readonly componentService: SalaryComponentService,
  ) {}

  async calculatePreview(
    companyId: string,
    periodStart: Date,
    periodEnd: Date,
    employeeId: string,
    attendanceStart?: Date,
    attendanceEnd?: Date,
    payDate?: Date,
    policySnapshot?: PolicySettingsDto,
  ): Promise<
    SalaryPreview & {
      sessions: any[];
      problems: PayrollProblem[];
      hasProblems: boolean;
      employeeName: string;
      employeeNo: number;
      policyName: string;
      attendanceStartDate: Date;
      attendanceEndDate: Date;
      payDate: Date;
      policyId?: string;
    }
  > {
    const aStart = attendanceStart || periodStart;
    const aEnd = attendanceEnd || periodEnd;

    const policy = policySnapshot ?? (await this.policiesService.getEffectivePolicy(employeeId));
    if (!policy) throw new NotFoundException('Policy not found for employee');

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    const payrollConfig = policy.payrollConfiguration;
    const baseRateDivisor = payrollConfig?.baseRateDivisor || 30;
    const calculationMethod = payrollConfig?.calculationMethod || PayrollCalculationMethod.FIXED_MONTHLY_SALARY;

    const employeeBaseSalary = employee.basicSalary;
    let basicSalaryForPeriod = 0;

    let otHourlyRate = 0;
    const config = (payrollConfig || {}) as any;
    const othValue = (config.otHourlyValue as number) || 8;
    if (config.otHourlyType === 'FIXED_AMOUNT') {
      otHourlyRate = othValue;
    } else {
      otHourlyRate = employeeBaseSalary / baseRateDivisor / othValue;
    }

    const dailyRate = employeeBaseSalary / baseRateDivisor;

    const sessions = await this.prisma.attendanceSession.findMany({
      where: {
        employeeId,
        date: { gte: aStart, lte: aEnd },
        OR: [
          { salaryId: null },
          {
            salary: {
              periodStartDate: periodStart,
              periodEndDate: periodEnd,
              status: SalaryStatus.DRAFT,
            },
          },
        ],
      },
      include: {
        payrollHoliday: true,
        workHoliday: true,
      },
    });

    let totalOtAmount = 0;
    let totalHolidayPayAmount = 0;
    const dynamicOtMap: Record<string, { hours: number; amount: number; type: string }> = {};
    const holidayPayMap: Record<
      string,
      { hours: number; amount: number; holidayName: string; affectTotalEarnings: boolean }
    > = {};

    sessions.forEach((session: ExtendedAttendanceSession) => {
      const ot = this.overtimeService.calculateOvertime(session, otHourlyRate, payrollConfig);
      if (ot.type !== 'NONE' && ot.matchedRule) {
        // Route earnings-affecting portion → Holiday Pay
        if (ot.earningsAffectingAmount > 0) {
          const holidayName = ot.matchedRule.isHoliday
            ? (session.payrollHoliday || session.workHoliday)?.name || 'Holiday OT'
            : 'Off Day OT';
          const holidayKey = `${ot.matchedRule.id || 'holiday'}-${session.date.toISOString()}`;

          if (!holidayPayMap[holidayKey]) {
            holidayPayMap[holidayKey] = {
              hours: 0,
              amount: 0,
              holidayName,
              affectTotalEarnings: true,
            };
          }
          const earningsHours = ot.amount > 0 ? ot.hours * (ot.earningsAffectingAmount / ot.amount) : 0;
          holidayPayMap[holidayKey].hours += earningsHours;
          holidayPayMap[holidayKey].amount += ot.earningsAffectingAmount;
          totalHolidayPayAmount += ot.earningsAffectingAmount;
        }

        // Route non-earnings portion → Regular OT
        if (ot.nonEarningsAffectingAmount > 0) {
          if (!dynamicOtMap[ot.type]) {
            dynamicOtMap[ot.type] = { hours: 0, amount: 0, type: ot.type };
          }
          const nonEarningsHours = ot.amount > 0 ? ot.hours * (ot.nonEarningsAffectingAmount / ot.amount) : 0;
          dynamicOtMap[ot.type].hours += nonEarningsHours;
          dynamicOtMap[ot.type].amount += ot.nonEarningsAffectingAmount;
          totalOtAmount += ot.nonEarningsAffectingAmount;
        }
      }
    });

    const otBreakdown = Object.entries(dynamicOtMap).map(([_, data]) => ({
      type: data.type,
      hours: data.hours,
      amount: data.amount,
    }));
    const holidayPayBreakdown = Object.values(holidayPayMap);

    if (calculationMethod !== PayrollCalculationMethod.SHIFT_ATTENDANCE_FLAT) {
      if (payrollConfig?.frequency === PayCycleFrequency.MONTHLY) {
        basicSalaryForPeriod = employeeBaseSalary;
      } else {
        const diffTime = Math.abs(periodEnd.getTime() - periodStart.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        basicSalaryForPeriod = (employeeBaseSalary / baseRateDivisor) * diffDays;
      }
    }

    let totalLateDeduction = 0;
    let totalLateMinutes = 0;
    if (payrollConfig?.autoDeductLate && payrollConfig?.lateDeductionValue) {
      totalLateMinutes = sessions.reduce((sum, s) => {
        const sessionLate = (s.lateMinutes || 0) + (s.earlyLeaveMinutes || 0);
        const grace = (config.lateDeductionGraceMinutes as number) || 0;
        return sum + Math.max(0, sessionLate - grace);
      }, 0);

      if (payrollConfig.lateDeductionType === 'DIVISOR_BASED') {
        const lateHourlyRate = employeeBaseSalary / baseRateDivisor / (payrollConfig.lateDeductionValue || 8);
        const minuteRate = lateHourlyRate / 60;
        totalLateDeduction = totalLateMinutes * minuteRate;
      } else {
        totalLateDeduction = (totalLateMinutes / 60) * payrollConfig.lateDeductionValue;
      }
    }

    let totalUnpaidAmount = 0;
    const unpaidBreakdown = [
      { type: 'ABSENCE', count: 0, amount: 0, reason: 'Absence without leave' },
      { type: 'UNPAID_LEAVE', count: 0, amount: 0, reason: 'Approved unpaid leave' },
    ];

    const approvedLeaves = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: LeaveStatus.APPROVED,
        startDate: { lte: aEnd },
        endDate: { gte: aStart },
      },
    });

    const unpaidLeaveTypeIds = ((policy.leaves?.leaveTypes as unknown as LeaveTypeDto[]) || [])
      .filter((lt) => lt.isPaid === false)
      .map((lt) => lt.id);

    if (payrollConfig?.autoDeductUnpaidLeaves) {
      const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

      const calculateNoPayDeduction = (type: string, value: number) => {
        if (type === 'DIVISOR_BASED') return value * dailyRate;
        return value;
      };

      for (let d = new Date(aStart); d <= aEnd; d.setUTCDate(d.getUTCDate() + 1)) {
        const dayStr = d.toISOString().split('T')[0];
        const session = sessions.find((s) => s.date.toISOString().split('T')[0] === dayStr);

        if (!session) {
          const dayName = dayNames[d.getUTCDay()];
          const dayConfig = (policy.workingDays?.defaultPattern as any)?.[dayName];

          if (dayConfig && dayConfig.type?.toString().toUpperCase() !== 'OFF') {
            unpaidBreakdown[0].count++;
            const amt = calculateNoPayDeduction(
              config.unpaidLeaveFullDayType as string,
              (config.unpaidLeaveFullDayValue as number) || 1,
            );
            unpaidBreakdown[0].amount += amt;
            totalUnpaidAmount += amt;
          }
        } else if (session.isOnLeave) {
          const activeLeave = approvedLeaves.find((l) => {
            const lStart = new Date(l.startDate);
            const lEnd = new Date(l.endDate);
            const dDate = new Date(dayStr);
            return dDate >= lStart && dDate <= lEnd;
          });

          if (activeLeave && unpaidLeaveTypeIds.includes(activeLeave.leaveTypeId)) {
            unpaidBreakdown[1].count++;
            const amt = session.isHalfDay
              ? calculateNoPayDeduction(
                  config.unpaidLeaveHalfDayType as string,
                  (config.unpaidLeaveHalfDayValue as number) || 0.5,
                )
              : calculateNoPayDeduction(
                  config.unpaidLeaveFullDayType as string,
                  (config.unpaidLeaveFullDayValue as number) || 1,
                );

            unpaidBreakdown[1].amount += amt;
            totalUnpaidAmount += amt;
          }
        } else if (session.isHalfDay) {
          const hasLeave = approvedLeaves.some((l) => {
            const lStart = new Date(l.startDate);
            const lEnd = new Date(l.endDate);
            const dDate = new Date(dayStr);
            return dDate >= lStart && dDate <= lEnd;
          });

          if (!hasLeave) {
            unpaidBreakdown[0].count += 0.5;
            const amt = calculateNoPayDeduction(
              config.unpaidLeaveHalfDayType as string,
              (config.unpaidLeaveHalfDayValue as number) || 0.5,
            );
            unpaidBreakdown[0].amount += amt;
            totalUnpaidAmount += amt;
          }
        }
      }
    }

    // Late deduction flows through processedComponents as LATE_DEDUCTION — do NOT add to noPayAmount
    const totalNoPayAmount = totalUnpaidAmount;
    const noPayBreakdown = [...unpaidBreakdown];

    const { processedComponents, currentTotalEarnings: statutoryBase } = this.componentService.processComponents(
      policy,
      basicSalaryForPeriod,
      totalUnpaidAmount,
      totalLateDeduction,
      totalHolidayPayAmount,
      totalOtAmount,
      holidayPayBreakdown,
      otBreakdown,
    );

    const advanceAdjustments = await this.advancesService.getActiveDeductions(employeeId, periodStart, periodEnd);
    const totalAdvanceDeduction = advanceAdjustments.reduce((sum, adj) => sum + adj.amount, 0);

    const existingSalary = await this.prisma.salary.findUnique({
      where: {
        employeeId_periodStartDate_periodEndDate: {
          employeeId,
          periodStartDate: periodStart,
          periodEndDate: periodEnd,
        },
      },
    });

    const hPayAdjustment = existingSalary?.holidayPayAdjustment || 0;
    const otAdj = existingSalary?.otAdjustment || 0;
    const recAdj = existingSalary?.recoveryAdjustment || 0;
    const lateAdj = existingSalary?.lateAdjustment || 0;

    const totalAdditions = processedComponents
      .filter((c) => c.category === 'ADDITION')
      .reduce((sum, c) => sum + c.amount, 0);

    const totalComponentDeductions = processedComponents
      .filter((c) => c.category === 'DEDUCTION')
      .reduce((sum, c) => sum + c.amount, 0);

    const grossEarnings = basicSalaryForPeriod + totalAdditions + otAdj + hPayAdjustment;
    const netSalary = grossEarnings - (totalComponentDeductions + totalNoPayAmount + totalAdvanceDeduction + recAdj + lateAdj);

    const problems = await this.validationService.validateEmployeePayroll(employeeId, aStart, aEnd, policy);

    return {
      employeeId,
      employeeName: employee.fullName,
      employeeNo: employee.employeeNo,
      policyName: policy.name || 'Default',
      periodStartDate: periodStart,
      periodEndDate: periodEnd,
      basicSalary: basicSalaryForPeriod,
      otAmount: totalOtAmount,
      otBreakdown: otBreakdown as unknown as Prisma.JsonValue,
      holidayPayAmount: totalHolidayPayAmount,
      holidayPayBreakdown: holidayPayBreakdown as unknown as Prisma.JsonValue,
      lateDeduction: totalLateDeduction,
      lateAdjustment: lateAdj,
      noPayAmount: totalNoPayAmount,
      noPayBreakdown: noPayBreakdown as unknown as Prisma.JsonValue,
      taxAmount: 0,
      components: processedComponents,
      advanceDeduction: totalAdvanceDeduction,
      netSalary,
      advanceAdjustments,
      sessionIds: sessions.map((s) => s.id),
      sessions: sessions,
      problems,
      hasProblems: problems.length > 0,
      holidayPayAdjustment: hPayAdjustment,
      holidayPayAdjustmentReason: existingSalary?.holidayPayAdjustmentReason || undefined,
      otAdjustment: otAdj,
      otAdjustmentReason: existingSalary?.otAdjustmentReason || undefined,
      recoveryAdjustment: recAdj,
      recoveryAdjustmentReason: existingSalary?.recoveryAdjustmentReason || undefined,
      attendanceStartDate: aStart,
      attendanceEndDate: aEnd,
      payDate: payDate || periodEnd,
    };
  }

  async bulkGenerate(
    companyId: string,
    periodStart: Date,
    periodEnd: Date,
    employeeIds?: string[],
    attendanceStart?: Date,
    attendanceEnd?: Date,
    payDate?: Date,
  ) {
    const targetEmployees = await this.prisma.employee.findMany({
      where: employeeIds && employeeIds.length > 0 ? { id: { in: employeeIds } } : { companyId, status: 'ACTIVE' },
      include: { policy: true },
    });

    const policySnapshots = await this.policiesService.resolveBulkPolicies(targetEmployees.map((e) => e.id));

    const previews: any[] = [];
    for (const emp of targetEmployees) {
      try {
        const preview = await this.calculatePreview(
          companyId,
          periodStart,
          periodEnd,
          emp.id,
          attendanceStart,
          attendanceEnd,
          payDate,
          policySnapshots.get(emp.id),
        );
        previews.push({
          ...preview,
          policyId: emp.policyId || 'DEFAULT',
        });
      } catch (error: any) {
        this.logger.error(`Error calculating salary for employee ${emp.id}: ${error.message as string}`);
      }
    }

    const grouped = groupBy(previews, 'policyId');
    return Object.entries(grouped).map(([policyId, items]) => ({
      policyId,
      policyName: items[0].policyName as string,
      employees: items,
      totalNet: items.reduce((sum, i) => sum + (i.netSalary as number), 0),
      problemCount: items.filter((i) => i.hasProblems).length,
    }));
  }

}
