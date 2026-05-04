import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { EmployerDashboardDto } from './dto/employer-dashboard.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) { }

  async getEmployerStats(userId: string): Promise<EmployerDashboardDto> {
    this.logger.log(`Fetching employer stats for user ${userId}`);

    // Get the user to check role
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    let companyIds: string[] = [];

    if (user?.role === Role.ADMIN) {
      this.logger.log(`Admin user ${userId} accessing global stats`);
      const allCompanies = await this.prisma.company.findMany({
        where: { active: true },
        select: { id: true },
        take: 100, // Balanced limit for dashboard view
      });
      companyIds = allCompanies.map((c) => c.id);
    } else {
      const memberships = await this.prisma.userCompany.findMany({
        where: { userId, role: Role.EMPLOYER, active: true },
        select: { companyId: true },
      });
      companyIds = memberships.map((m) => m.companyId);
    }

    if (companyIds.length === 0) {
      return this.getEmptyStats();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      companiesCount,
      employeesCount,
      pendingLeavesCount,
      todaySessions,
      recentAuditLogs,
      pendingSalariesCount,
      unpaidBillingCount,
    ] = await Promise.all([
      this.prisma.company.count({ where: { id: { in: companyIds }, active: true } }),
      this.prisma.employee.count({ where: { companyId: { in: companyIds }, status: 'ACTIVE' } }),
      this.prisma.leaveRequest.count({ where: { companyId: { in: companyIds }, status: 'PENDING' } }),
      this.prisma.attendanceSession.findMany({
        where: { companyId: { in: companyIds }, date: today },
        select: { checkInTime: true, isLate: true },
      }),
      this.prisma.auditLog.findMany({
        where: { companyId: { in: companyIds } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, action: true, entity: true, details: true, createdAt: true, resourceId: true },
      }),
      this.prisma.salary.count({ where: { companyId: { in: companyIds }, status: { in: ['APPROVED', 'PARTIALLY_PAID'] } } }),
      this.prisma.paymentInvoice.count({ where: { companyId: { in: companyIds }, status: { in: ['UNPAID', 'PENDING'] } } }),
    ]);

    // Attendance breakdown
    const present = todaySessions.filter((s) => s.checkInTime).length;
    const late = todaySessions.filter((s) => s.isLate).length;
    const absent = Math.max(0, employeesCount - present);

    return {
      companiesCount,
      employeesCount,
      pendingLeavesCount,
      pendingSalariesCount,
      unpaidBillingCount,
      attendance: { present, late, absent, totalEmployees: employeesCount },
      recentActivity: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        details: this.formatAuditDetails(log),
        createdAt: log.createdAt,
        type: this.mapEntityToType(log.entity || ''),
      })),
    };
  }

  async getCompanyDashboardStats(companyId: string): Promise<any> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      employeesCount,
      attendanceSessions,
      pendingLeaves,
      salaries,
      activeAdvances,
      unpaidInvoices,
      epfUnpaid,
      etfUnpaid,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.attendanceSession.findMany({
        where: { companyId, date: { gte: startOfMonth, lte: endOfMonth } },
        select: { checkInTime: true, checkOutTime: true, date: true },
      }),
      this.prisma.leaveRequest.count({ where: { companyId, status: 'PENDING' } }),
      this.prisma.salary.findMany({
        where: { companyId },
        orderBy: { periodEndDate: 'desc' },
        take: 50,
        select: {
          netSalary: true,
          payDate: true,
          status: true,
          periodEndDate: true,
          components: true,
          payments: { select: { amount: true, date: true } },
        },
      }),
      this.prisma.salaryAdvance.aggregate({
        where: { companyId, remainingAmount: { gt: 0 } },
        _sum: { remainingAmount: true },
        _count: { id: true },
      }),
      this.prisma.paymentInvoice.findMany({
        where: { companyId, status: { in: ['UNPAID', 'PENDING'] } },
        select: { totalLkr: true },
      }),
      this.prisma.epfRecord.aggregate({
        where: { companyId, paidDate: null },
        _sum: { totalContribution: true, surcharge: true },
        _count: { id: true },
      }),
      this.prisma.etfRecord.aggregate({
        where: { companyId, paidDate: null },
        _sum: { totalContribution: true, surcharge: true },
        _count: { id: true },
      }),
    ]);

    // Attendance (Today only for quick view)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySessions = attendanceSessions.filter((s) => s.date.getTime() === today.getTime());
    const present = todaySessions.filter((s) => s.checkInTime && !s.checkOutTime).length;
    const completed = todaySessions.filter((s) => s.checkOutTime).length;
    const absent = Math.max(0, employeesCount - (present + completed));

    // Get historical salary data for trend (past 4 months)
    const fourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const [historicalSalaries, recentLogs] = await Promise.all([
      this.prisma.salary.findMany({
        where: { 
          companyId, 
          status: { in: ['PAID', 'PARTIALLY_PAID'] }, 
          payDate: { gte: fourMonthsAgo } 
        },
        select: { netSalary: true, payDate: true, payments: { select: { amount: true, date: true } } },
      }),
      this.prisma.auditLog.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, action: true, entity: true, details: true, createdAt: true },
      }),
    ]);

    // Payroll Analysis
    let totalPendingAmount = 0;
    let totalPendingCount = 0;
    let totalOverdueAmount = 0;
    let totalOverdueCount = 0;
    let disbursedThisMonth = 0;

    for (const s of salaries) {
      const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = s.netSalary - paid;

      // Disbursed this month
      const paidThisMonth = s.payments
        .filter((p) => p.date >= startOfMonth && p.date <= endOfMonth)
        .reduce((sum, p) => sum + p.amount, 0);
      disbursedThisMonth += paidThisMonth;

      if (balance > 0.01 && s.status !== 'PAID') {
        totalPendingAmount += balance;
        totalPendingCount += 1;
        if (s.payDate && s.payDate < now) {
          totalOverdueAmount += balance;
          totalOverdueCount += 1;
        }
      }
    }

    // Trend calculation (Volume based on period end date)
    const trend: { label: string; amount: number }[] = [];
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    // Get all salaries for the past 6 months to calculate volume
    const trendSalaries = await this.prisma.salary.findMany({
      where: { 
        companyId, 
        status: { not: 'DRAFT' }, 
        periodEndDate: { gte: sixMonthsAgo } 
      },
      select: { netSalary: true, periodEndDate: true },
    });

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const amount = trendSalaries
        .filter(s => s.periodEndDate >= mStart && s.periodEndDate <= mEnd)
        .reduce((sum, s) => sum + s.netSalary, 0);

      trend.unshift({ label, amount });
    }

    // Determine "Current Month" context from the most recent salaries
    const latestSalary = salaries[0];
    const contextStart = latestSalary ? new Date(latestSalary.periodEndDate.getFullYear(), latestSalary.periodEndDate.getMonth(), 1) : startOfMonth;
    const contextEnd = latestSalary ? new Date(latestSalary.periodEndDate.getFullYear(), latestSalary.periodEndDate.getMonth() + 1, 0, 23, 59, 59, 999) : endOfMonth;

    // Billing
    const unpaidBillingAmount = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.totalLkr), 0);

    // Statutory Summary (Context Month)
    let epfEmployee = 0;
    let epfEmployer = 0;
    let etf = 0;

    for (const s of salaries) {
      if (s.periodEndDate >= contextStart && s.periodEndDate <= contextEnd) {
        const comps = (s.components as any[]) || [];
        const epfEmp = comps.find(c => c.systemType === 'EPF_EMPLOYEE');
        const epfComp = comps.find(c => c.systemType === 'EPF_EMPLOYER');
        const etfComp = comps.find(c => c.systemType === 'ETF');

        epfEmployee += epfEmp?.amount || 0;
        epfEmployer += epfComp?.amount || epfEmp?.employerAmount || 0;
        etf += etfComp?.amount || 0;
      }
    }

    return {
      attendance: {
        present,
        completed,
        absent,
        totalEmployees: employeesCount,
      },
      payroll: {
        disbursedThisMonth,
        pendingAmount: totalPendingAmount,
        pendingCount: totalPendingCount,
        overdueAmount: totalOverdueAmount,
        overdueCount: totalOverdueCount,
        trend,
      },
      advances: {
        outstandingAmount: activeAdvances._sum.remainingAmount ?? 0,
        activeCount: activeAdvances._count.id,
      },
      leaves: {
        pendingCount: pendingLeaves,
      },
      billing: {
        unpaidAmount: unpaidBillingAmount,
        unpaidCount: unpaidInvoices.length,
      },
      statutory: {
        epfEmployee,
        epfEmployer,
        etfTotal: etf,
        totalStatutory: epfEmployee + epfEmployer + etf,
        unpaidRecords: epfUnpaid._count.id + etfUnpaid._count.id,
        epfToSettle: Number(epfUnpaid._sum.totalContribution ?? 0) + Number(epfUnpaid._sum.surcharge ?? 0),
        epfEmployeeToSettle: Number(epfUnpaid._sum.totalContribution ?? 0) * 0.4,
        epfEmployerToSettle: (Number(epfUnpaid._sum.totalContribution ?? 0) * 0.6) + Number(epfUnpaid._sum.surcharge ?? 0),
        etfToSettle: Number(etfUnpaid._sum.totalContribution ?? 0) + Number(etfUnpaid._sum.surcharge ?? 0),
        history: await this.getStatutoryHistory(companyId),
        _debug: { epfCount: epfUnpaid._count.id, etfCount: etfUnpaid._count.id }
      },
      recentActivity: recentLogs.map((log) => ({
        id: log.id,
        action: log.action,
        details: this.formatAuditDetails(log),
        createdAt: log.createdAt,
        type: this.mapEntityToType(log.entity || ''),
      })),
      salaryAnalysis: await this.getSalaryAnalysis(companyId),
    };
  }

  async getAdminStats() {
    this.logger.log('Fetching admin dashboard stats');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      companiesCount,
      employeesCount,
      pendingInvoicesCount,
      unpaidInvoicesCount,
      mrrThisMonth,
      suspendedCompaniesCount,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.company.count({ where: { active: true } }),
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.paymentInvoice.count({ where: { status: 'PENDING' } }),
      this.prisma.paymentInvoice.count({ where: { status: 'UNPAID' } }),
      this.prisma.paymentInvoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { totalLkr: true },
      }),
      this.prisma.companyBilling.count({ where: { suspensionLevel: { not: 'NONE' } } }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, action: true, entity: true, details: true, createdAt: true },
      }),
    ]);

    return {
      companiesCount,
      employeesCount,
      pendingInvoicesCount,
      unpaidInvoicesCount,
      mrrThisMonth: Number(mrrThisMonth._sum.totalLkr ?? 0),
      suspendedCompaniesCount,
      recentActivity: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        details: this.formatAuditDetails(log),
        createdAt: log.createdAt,
        type: this.mapEntityToType(log.entity || ''),
      })),
    };
  }

  private getEmptyStats(): EmployerDashboardDto {
    return {
      companiesCount: 0,
      employeesCount: 0,
      pendingLeavesCount: 0,
      pendingSalariesCount: 0,
      unpaidBillingCount: 0,
      attendance: { present: 0, late: 0, absent: 0, totalEmployees: 0 },
      recentActivity: [],
    };
  }

  private async getStatutoryHistory(companyId: string) {
    const now = new Date();
    
    // Query records from the statutory models
    const [epfRecords, etfRecords] = await Promise.all([
      this.prisma.epfRecord.findMany({
        where: { companyId },
        include: {
          salaries: {
            select: { components: true }
          }
        }
      }),
      this.prisma.etfRecord.findMany({
        where: { companyId }
      })
    ]);

    const history: any[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const month = d.getMonth() + 1;
      const year = d.getFullYear();

      let epfEmp = 0;
      let epfComp = 0;
      let etf = 0;

      // Aggregate EPF records for this month
      const monthEpf = epfRecords.filter(r => Number(r.month) === Number(month) && Number(r.year) === Number(year));
      for (const r of monthEpf) {
        // Only count if paid
        if (r.paidDate === null) continue;

        let recordEmp = 0;
        let recordComp = 0;
        
        if (r.salaries && r.salaries.length > 0) {
          for (const s of r.salaries) {
            const comps = (s.components as any[]) || [];
            const e = comps.find(c => c.systemType === 'EPF_EMPLOYEE');
            const c = comps.find(c => c.systemType === 'EPF_EMPLOYER');
            recordEmp += e?.amount || 0;
            recordComp += c?.amount || e?.employerAmount || 0;
          }
        }

        if (recordEmp === 0 && recordComp === 0) {
          epfEmp += r.totalContribution * 0.4;
          epfComp += r.totalContribution * 0.6;
        } else {
          epfEmp += recordEmp;
          epfComp += recordComp;
        }
      }

      // Aggregate ETF records for this month
      const monthEtf = etfRecords.filter(r => Number(r.month) === Number(month) && Number(r.year) === Number(year));
      for (const r of monthEtf) {
        if (r.paidDate === null) continue;
        etf += r.totalContribution;
      }

      history.unshift({ label, epfEmp, epfComp, etf, total: epfEmp + epfComp + etf });
    }

    return history;
  }

  private async getSalaryAnalysis(companyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [latestPeriod, historicalSalaries] = await Promise.all([
      this.prisma.salary.findFirst({
        where: { companyId },
        orderBy: { periodEndDate: 'desc' },
        select: { periodEndDate: true }
      }),
      this.prisma.salary.findMany({
        where: {
          companyId,
          periodEndDate: { gte: sixMonthsAgo },
          status: { in: ['PAID', 'APPROVED', 'PARTIALLY_PAID'] }
        },
        select: { netSalary: true, periodEndDate: true, otAmount: true, holidayPayAmount: true },
      }),
    ]);

    const contextDate = latestPeriod?.periodEndDate || now;
    const cStart = new Date(contextDate.getFullYear(), contextDate.getMonth(), 1);
    const cEnd = new Date(contextDate.getFullYear(), contextDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const [currentSalaries, attendanceSummary] = await Promise.all([
      this.prisma.salary.findMany({
        where: {
          companyId,
          periodEndDate: { gte: cStart, lte: cEnd }
        },
        select: {
          otAmount: true,
          holidayPayAmount: true,
          noPayAmount: true,
          basicSalary: true,
          netSalary: true,
          components: true,
          otBreakdown: true
        },
      }),
      this.prisma.attendanceSession.aggregate({
        where: { companyId, date: { gte: cStart, lte: cEnd } },
        _sum: { workMinutes: true, overtimeMinutes: true },
      }),
    ]);

    // Current Month Totals
    let otTotal = 0;
    let holidayTotal = 0;
    let noPayTotal = 0;
    let allowanceTotal = 0;
    let basicTotal = 0;
    let otHoursFromSalaries = 0;

    for (const s of currentSalaries) {
      otTotal += s.otAmount;
      holidayTotal += s.holidayPayAmount;
      noPayTotal += s.noPayAmount;
      basicTotal += s.basicSalary;

      const otBreakdown = (s.otBreakdown as any[]) || [];
      otHoursFromSalaries += otBreakdown.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);

      const comps = (s.components as any[]) || [];
      allowanceTotal += comps
        .filter(c => c.type === 'EARNING' && !['BASIC', 'OT', 'HOLIDAY_PAY'].includes(c.systemType))
        .reduce((sum, c) => sum + (c.amount || 0), 0);
    }

    // 6-Month Trend
    const trend: any[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthData = historicalSalaries.filter(s => s.periodEndDate >= mStart && s.periodEndDate <= mEnd);
      trend.unshift({
        label,
        net: monthData.reduce((sum, s) => sum + s.netSalary, 0),
        ot: monthData.reduce((sum, s) => sum + s.otAmount, 0),
        holiday: monthData.reduce((sum, s) => sum + s.holidayPayAmount, 0),
      });
    }

    return {
      current: {
        otTotal,
        holidayTotal,
        noPayTotal,
        allowanceTotal,
        basicTotal,
        workHours: Math.round((attendanceSummary._sum.workMinutes || 0) / 60),
        otHours: Math.round(otHoursFromSalaries || (attendanceSummary._sum.overtimeMinutes || 0) / 60),
      },
      trend,
    };
  }

  private mapEntityToType(entity: string): any {
    if (!entity) return 'COMPANY';
    const e = entity.toUpperCase();
    if (e.includes('EMPLOYEE')) return 'EMPLOYEE';
    if (e.includes('LEAVE')) return 'LEAVE';
    if (e.includes('SALARY') || e.includes('PAYROLL') || e.includes('PAYMENT')) return 'PAYROLL';
    return 'COMPANY';
  }

  private formatAuditDetails(log: any): string {
    if (log.details && typeof log.details === 'object' && log.details.message) {
      return log.details.message;
    }
    return `${log.action} on ${log.entity || 'resource'}`;
  }
}
