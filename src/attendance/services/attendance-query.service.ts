import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionQueryDto, EventQueryDto } from '../dto/session.dto';
import { AttendanceSession, Prisma, Holiday } from '@prisma/client';
import { TimeService } from './time.service';
import { PoliciesService } from '../../policies/policies.service';
import { calculateOvertimeForSession } from '../utils/overtime-calculator';
import { PayrollCalculationMethod } from '../../policies/dto/payroll-settings-policy.dto';

@Injectable()
export class AttendanceQueryService {
  private readonly logger = new Logger(AttendanceQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly timeService: TimeService,
    private readonly policiesService: PoliciesService,
  ) {}

  /**
   * Get sessions with pagination
   */
  async getSessions(query: SessionQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 15;
    const skip = (page - 1) * limit;

    const andConditions: Prisma.AttendanceSessionWhereInput[] = [];
    if (query.companyId) andConditions.push({ companyId: query.companyId });
    if (query.employeeId) andConditions.push({ employeeId: query.employeeId });

    if (query.isPending) {
      andConditions.push({
        OR: [{ inApprovalStatus: 'PENDING' }, { outApprovalStatus: 'PENDING' }],
      });
    }

    if (query.startDate || query.endDate || query.includeActive) {
      const orConditions: Prisma.AttendanceSessionWhereInput[] = [];
      if (query.startDate || query.endDate) {
        const dateFilter: Prisma.DateTimeFilter = {};
        if (query.startDate) dateFilter.gte = new Date(query.startDate);
        if (query.endDate) dateFilter.lte = new Date(query.endDate);
        orConditions.push({ date: dateFilter });
      }

      if (query.includeActive) {
        orConditions.push({ checkOutTime: null, checkInTime: { not: null } });
      }

      if (orConditions.length > 0) {
        andConditions.push({ OR: orConditions });
      }
    }

    const where: Prisma.AttendanceSessionWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [items, total] = await Promise.all([
      this.prisma.attendanceSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          employee: {
            select: {
              employeeNo: true,
              nameWithInitials: true,
              fullName: true,
              photo: true,
            },
          },
          workHoliday: true,
          payrollHoliday: true,
        },
      }),
      this.prisma.attendanceSession.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single session by ID
   */
  async getSession(id: string): Promise<AttendanceSession> {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            employeeNo: true,
            nameWithInitials: true,
            fullName: true,
            photo: true,
          },
        },
        workHoliday: true,
        payrollHoliday: true,
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  /**
   * Get events for a specific session
   */
  async getSessionEvents(sessionId: string) {
    return this.prisma.attendanceEvent.findMany({
      where: { sessionId },
      orderBy: { eventTime: 'asc' },
      include: {
        employee: {
          select: {
            employeeNo: true,
            nameWithInitials: true,
            fullName: true,
            photo: true,
          },
        },
      },
    });
  }

  /**
   * Get events with pagination
   */
  async getEvents(query: EventQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceEventWhereInput = {};
    if (query.companyId) where.companyId = query.companyId;
    if (query.employeeId) where.employeeId = query.employeeId;

    if (query.startDate || query.endDate) {
      const company = await this.prisma.company.findUnique({
        where: { id: query.companyId },
        select: { timezone: true },
      });
      const timezone = company?.timezone || 'UTC';

      const eventTimeFilter: Prisma.DateTimeFilter = {};
      if (query.startDate) {
        eventTimeFilter.gte = this.timeService.getStartOfDayInTimezone(new Date(query.startDate), timezone);
      }
      if (query.endDate) {
        eventTimeFilter.lte = this.timeService.getEndOfDayInTimezone(new Date(query.endDate), timezone);
      }
      where.eventTime = eventTimeFilter;
    }

    if (query.status) where.status = query.status;
    if (query.onlyUnlinked) where.sessionId = null;

    const [items, total] = await Promise.all([
      this.prisma.attendanceEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { eventTime: 'desc' },
        include: {
          employee: {
            select: {
              employeeNo: true,
              nameWithInitials: true,
              fullName: true,
              photo: true,
            },
          },
        },
      }),
      this.prisma.attendanceEvent.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Daily Overview
   */
  async getOverview(companyId: string, dateStr?: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { timezone: true },
    });
    const timezone = company?.timezone || 'UTC';
    const referenceDate = dateStr ? new Date(dateStr) : new Date();

    const startOfDay = this.timeService.getStartOfDayInTimezone(referenceDate, timezone);
    const endOfDay = this.timeService.getEndOfDayInTimezone(referenceDate, timezone);

    // 1. Get all active employees
    const employees = await this.prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: {
        id: true,
        employeeNo: true,
        nameWithInitials: true,
        fullName: true,
        photo: true,
        designation: true,
      },
    });

    // 2. Get today's sessions
    const sessions = await this.prisma.attendanceSession.findMany({
      where: {
        companyId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        employee: {
          select: { id: true, nameWithInitials: true, employeeNo: true, photo: true, fullName: true },
        },
      },
    });

    // 3. Get today's approved leaves
    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        companyId,
        status: 'APPROVED',
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
      },
      include: {
        employee: {
          select: { id: true, nameWithInitials: true, employeeNo: true, photo: true, fullName: true },
        },
      },
    });

    // Categorize
    const present = sessions.filter((s) => !s.checkOutTime);
    const completed = sessions.filter((s) => !!s.checkOutTime);
    const leaveIds = new Set(leaves.map((l) => l.employeeId));
    const presentIds = new Set(present.map((s) => s.employeeId));
    const completedIds = new Set(completed.map((s) => s.employeeId));

    const absentEmployees = employees.filter(
      (emp) => !presentIds.has(emp.id) && !completedIds.has(emp.id) && !leaveIds.has(emp.id),
    );

    // For absents, find last out efficiently
    const absentLastSessions = await this.prisma.attendanceSession.findMany({
      where: {
        employeeId: { in: absentEmployees.map((a) => a.id) },
        checkOutTime: { not: null },
      },
      orderBy: [{ date: 'desc' }, { checkOutTime: 'desc' }],
      distinct: ['employeeId'],
      select: {
        employeeId: true,
        checkOutTime: true,
        date: true,
      },
    });

    const lastSessionMap = new Map(absentLastSessions.map((s) => [s.employeeId, s]));

    // 4. Get pending counts for dashboard optimization
    const [pendingLeavesCount, pendingAttendanceCount] = await Promise.all([
      this.prisma.leaveRequest.count({
        where: { companyId, status: 'PENDING' },
      }),
      this.prisma.attendanceSession.count({
        where: {
          companyId,
          OR: [{ inApprovalStatus: 'PENDING' }, { outApprovalStatus: 'PENDING' }],
        },
      }),
    ]);

    return {
      stats: {
        total: employees.length,
        present: present.length,
        completed: completed.length,
        leave: leaves.length,
        absent: absentEmployees.length,
        pendingLeaves: pendingLeavesCount,
        pendingAttendance: pendingAttendanceCount,
      },
      present,
      completed,
      leaves,
      absent: absentEmployees.map((emp) => ({
        ...emp,
        lastSession: lastSessionMap.get(emp.id),
      })),
    };
  }

  /**
   * Get Period Statistics
   */
  async getStats(companyId: string, query: { startDate?: string; endDate?: string; employeeId?: string }) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { timezone: true },
    });
    const timezone = company?.timezone || 'UTC';

    const where: Prisma.AttendanceSessionWhereInput = { companyId };
    if (query.employeeId) where.employeeId = query.employeeId;

    if (query.startDate || query.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.startDate) dateFilter.gte = this.timeService.getStartOfDayInTimezone(new Date(query.startDate), timezone);
      if (query.endDate) dateFilter.lte = this.timeService.getEndOfDayInTimezone(new Date(query.endDate), timezone);
      where.date = dateFilter;
    }

    // 1. Fetch Sessions
    const sessions = await this.prisma.attendanceSession.findMany({
      where,
      include: {
        employee: {
          select: { id: true, employeeNo: true, fullName: true, photo: true, basicSalary: true },
        },
        workHoliday: true,
        payrollHoliday: true,
      },
    });

    // 2. Fetch Leaves
    const leaveWhere: Prisma.LeaveRequestWhereInput = {
      companyId,
      status: 'APPROVED',
    };
    if (query.employeeId) leaveWhere.employeeId = query.employeeId;

    if (query.startDate || query.endDate) {
      if (query.startDate) leaveWhere.endDate = { gte: new Date(query.startDate) };
      if (query.endDate) leaveWhere.startDate = { lte: new Date(query.endDate) };
    }

    const leaves = await this.prisma.leaveRequest.findMany({
      where: leaveWhere,
      include: {
        employee: {
          select: { id: true, employeeNo: true, fullName: true, photo: true },
        },
      },
    });

    // 3. Resolve Policies for Employees
    const uniqueEmployeeIds = [...new Set(sessions.map((s) => s.employeeId))];
    const policySnapshots = await this.policiesService.resolveBulkPolicies(uniqueEmployeeIds);

    // AGGREGATION LOGIC
    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;
    let holidayOvertimeMinutes = 0;
    let regularOvertimeMinutes = 0;
    const totalSessions = sessions.length;

    const employeeStats: Record<string, any> = {};
    const lateEmployees = new Map<string, any>();
    const earlyLeaveEmployees = new Map<string, any>();
    const overtimeEmployees = new Map<string, any>();
    const leaveEmployees = new Map<string, any>();

    // Process Sessions
    sessions.forEach((s) => {
      totalWorkMinutes += s.workMinutes || 0;

      // START: Accurate OT Calculation
      const policy = policySnapshots.get(s.employeeId);
      const payrollConfig = policy?.payrollConfiguration;
      const baseRateDivisor = (payrollConfig as any)?.baseRateDivisor || 30;
      const calculationMethod = (payrollConfig as any)?.calculationMethod || PayrollCalculationMethod.FIXED_MONTHLY_SALARY;

      let otMins = s.overtimeMinutes || 0;
      let holidayMins = 0;
      let regularMins = 0;

      if (policy && payrollConfig && calculationMethod !== PayrollCalculationMethod.SHIFT_ATTENDANCE_FLAT && calculationMethod !== PayrollCalculationMethod.DAILY_ATTENDANCE_FLAT) {
        const config = (payrollConfig || {}) as any;
        const employeeBaseSalary = s.employee.basicSalary || 0;
        let otHourlyRate = 0;
        const othValue = (config.otHourlyValue as number) || 8;

        if (config.otHourlyType === 'FIXED_AMOUNT') {
          otHourlyRate = othValue;
        } else {
          otHourlyRate = employeeBaseSalary / baseRateDivisor / othValue;
        }

        const otRules = (config.otRules as any[]) || [];
        const isSessionOnHoliday = !!(s.workHolidayId || s.payrollHolidayId);
        const holiday = s.payrollHoliday || s.workHoliday;
        const holidayFlags: string[] = [];
        if (isSessionOnHoliday && holiday) {
          if ((holiday as Holiday).isPublic) holidayFlags.push('PUBLIC');
          if ((holiday as Holiday).isMercantile) holidayFlags.push('MERCANTILE');
          if ((holiday as Holiday).isBank) holidayFlags.push('BANK');
        }

        const otResult = calculateOvertimeForSession(
          s.workMinutes || 0,
          s.workDayStatus as any,
          isSessionOnHoliday,
          holidayFlags,
          otHourlyRate,
          otRules,
        );

        if (otResult.hasOt) {
          otMins = otResult.hours * 60;
          holidayMins = otResult.earningsAffectingMinutes;
          regularMins = otResult.nonEarningsAffectingMinutes;
        }
      } else {
        // Fallback if no policy (shouldn't happen with resolveBulkPolicies)
        const isHolidayOrOff = !!(s.workHolidayId || s.payrollHolidayId) || s.workDayStatus === 'OFF';
        if (isHolidayOrOff) holidayMins = otMins;
        else regularMins = otMins;
      }

      totalOvertimeMinutes += otMins;
      holidayOvertimeMinutes += holidayMins;
      regularOvertimeMinutes += regularMins;

      if (s.employeeId) {
        if (!employeeStats[s.employeeId]) {
          employeeStats[s.employeeId] = {
            id: s.employeeId,
            fullName: s.employee?.fullName || 'Unknown',
            employeeNo: s.employee?.employeeNo,
            photo: s.employee?.photo,
            workMinutes: 0,
            overtimeMinutes: 0,
            holidayOtMinutes: 0,
            regularOtMinutes: 0,
            sessions: 0,
            lateCount: 0,
            earlyLeaveCount: 0,
          };
        }

        const est = employeeStats[s.employeeId];
        est.workMinutes += s.workMinutes || 0;
        est.overtimeMinutes += otMins;
        est.holidayOtMinutes += holidayMins;
        est.regularOtMinutes += regularMins;
        est.sessions += 1;

        if (s.isLate) {
          est.lateCount += 1;
          lateEmployees.set(s.employeeId, est);
        }
        if (s.isEarlyLeave) {
          est.earlyLeaveCount += 1;
          earlyLeaveEmployees.set(s.employeeId, est);
        }
        if (otMins > 0) {
          overtimeEmployees.set(s.employeeId, est);
        }
      }
    });

    // Process Leaves
    let fullDaysCount = 0;
    let halfDaysCount = 0;
    let shortLeavesCount = 0;

    leaves.forEach((l) => {
      if (l.type === 'FULL_DAY') fullDaysCount += l.days;
      else if (l.type === 'HALF_DAY_FIRST' || l.type === 'HALF_DAY_LAST') halfDaysCount += 0.5;
      else if (l.type === 'SHORT_LEAVE') shortLeavesCount += 1;

      if (l.employeeId) {
        if (!leaveEmployees.has(l.employeeId)) {
          leaveEmployees.set(l.employeeId, {
            id: l.employeeId,
            fullName: l.employee?.fullName || 'Unknown',
            employeeNo: l.employee?.employeeNo,
            photo: l.employee?.photo,
            fullDays: 0,
            halfDays: 0,
            shortLeaves: 0,
          });
        }
        const le = leaveEmployees.get(l.employeeId);
        if (l.type === 'FULL_DAY') le.fullDays += l.days;
        else if (l.type === 'HALF_DAY_FIRST' || l.type === 'HALF_DAY_LAST') le.halfDays += 0.5;
        else if (l.type === 'SHORT_LEAVE') le.shortLeaves += 1;
      }
    });

    const avgWorkMinutes = totalSessions > 0 ? totalWorkMinutes / totalSessions : 0;

    return {
      totalSessions,
      totalWorkMinutes,
      totalOvertimeMinutes,
      holidayOvertimeMinutes,
      regularOvertimeMinutes,
      avgWorkMinutes,
      leaves: {
        totalApproved: fullDaysCount + halfDaysCount,
        fullDays: fullDaysCount,
        halfDays: halfDaysCount,
        shortLeaves: shortLeavesCount,
      },
      lateEmployees: Array.from(lateEmployees.values()).sort((a, b) => b.lateCount - a.lateCount),
      earlyLeaveEmployees: Array.from(earlyLeaveEmployees.values()).sort((a, b) => b.earlyLeaveCount - a.earlyLeaveCount),
      overtimeEmployees: Array.from(overtimeEmployees.values()).sort((a, b) => b.overtimeMinutes - a.overtimeMinutes),
      leaveEmployees: Array.from(leaveEmployees.values()).sort(
        (a, b) => b.fullDays + b.halfDays - (a.fullDays + a.halfDays),
      ),
      allEmployeeStats: Object.values(employeeStats),
    };
  }
}
