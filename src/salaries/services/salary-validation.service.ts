import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaveStatus, ApprovalStatus } from '@prisma/client';
import { PolicySettingsDto } from '../../policies/dto/policy-settings.dto';
import { PayrollComponentSystemType } from '../../policies/dto/salary-components-policy.dto';

export interface PayrollProblem {
  type: 'PENDING_LEAVE' | 'UNAPPROVED_ATTENDANCE' | 'UNCLOSED_SESSION' | 'MISSING_ATTENDANCE' | 'MISSING_STATUTORY_COMPONENT';
  severity: 'ERROR' | 'WARNING';
  message: string;
  count?: number;
  date?: string;
}

@Injectable()
export class SalaryValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateEmployeePayroll(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
    policy: PolicySettingsDto,
  ): Promise<PayrollProblem[]> {
    const problems: PayrollProblem[] = [];

    // 1. Check for Pending Leaves
    const pendingLeaves = await this.prisma.leaveRequest.count({
      where: {
        employeeId,
        status: LeaveStatus.PENDING,
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
      },
    });

    if (pendingLeaves > 0) {
      problems.push({
        type: 'PENDING_LEAVE',
        severity: 'ERROR',
        message: `Found ${pendingLeaves} pending leave requests in this period.`,
        count: pendingLeaves,
      });
    }

    // 2. Check for Unapproved Attendance Sessions
    const unapprovedSessions = await this.prisma.attendanceSession.count({
      where: {
        employeeId,
        date: { gte: periodStart, lte: periodEnd },
        OR: [{ inApprovalStatus: ApprovalStatus.PENDING }, { outApprovalStatus: ApprovalStatus.PENDING }],
      },
    });

    if (unapprovedSessions > 0) {
      problems.push({
        type: 'UNAPPROVED_ATTENDANCE',
        severity: 'ERROR',
        message: `Found ${unapprovedSessions} sessions requiring approval.`,
        count: unapprovedSessions,
      });
    }

    // 3. Check for Unclosed Sessions
    const unclosedSessions = await this.prisma.attendanceSession.findMany({
      where: {
        employeeId,
        date: { gte: periodStart, lte: periodEnd },
        checkInTime: { not: null },
        checkOutTime: null,
        isOnLeave: false,
      },
      select: { date: true },
    });

    if (unclosedSessions.length > 0) {
      const datesStr = unclosedSessions.map((s) => s.date.toISOString().split('T')[0]).join(', ');
      problems.push({
        type: 'UNCLOSED_SESSION',
        severity: 'ERROR',
        message: `Found ${unclosedSessions.length} unclosed sessions (missing check-out) on: ${datesStr}`,
        count: unclosedSessions.length,
      });
    }

    // 4. Check for Missing Attendance
    const sessions = await this.prisma.attendanceSession.findMany({
      where: { employeeId, date: { gte: periodStart, lte: periodEnd } },
      select: { date: true },
    });

    const approvedLeaves = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: LeaveStatus.APPROVED,
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
      },
      select: { startDate: true, endDate: true },
    });

    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
    const currentDate = new Date(periodStart);
    while (currentDate <= periodEnd) {
      const dayStr = currentDate.toISOString().split('T')[0];
      const hasSession = sessions.some((s) => s.date.toISOString().split('T')[0] === dayStr);
      const hasApprovedLeave = approvedLeaves.some((l) => {
        const lStart = new Date(l.startDate);
        const lEnd = new Date(l.endDate);
        const dDate = new Date(dayStr);
        return dDate >= lStart && dDate <= lEnd;
      });

      const dayName = dayNames[currentDate.getUTCDay()];
      const dayConfig = (policy.workingDays?.defaultPattern as any)?.[dayName];

      if (!hasSession && !hasApprovedLeave && dayConfig && dayConfig.type?.toString().toUpperCase() !== 'OFF') {
        problems.push({
          type: 'MISSING_ATTENDANCE',
          severity: 'WARNING',
          message: `No attendance log or approved leave found for working day: ${dayStr}`,
          date: dayStr,
        });
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    // 5. Check for missing statutory EPF/ETF components in policy
    const components = policy.salaryComponents?.components || [];
    const hasEpf = components.some(
      (c) => c.systemType === PayrollComponentSystemType.EPF_EMPLOYEE || c.systemType === PayrollComponentSystemType.EPF_EMPLOYER,
    );
    const hasEtf = components.some((c) => c.systemType === PayrollComponentSystemType.ETF_EMPLOYER);

    if (!hasEpf) {
      problems.push({
        type: 'MISSING_STATUTORY_COMPONENT',
        severity: 'WARNING',
        message: 'No EPF component found in policy. EPF deductions will not be applied.',
      });
    }

    if (!hasEtf) {
      problems.push({
        type: 'MISSING_STATUTORY_COMPONENT',
        severity: 'WARNING',
        message: 'No ETF component found in policy. ETF contributions will not be applied.',
      });
    }

    return problems;
  }
}
