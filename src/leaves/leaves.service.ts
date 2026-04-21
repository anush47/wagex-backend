import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PoliciesService } from '../policies/policies.service';
import { AttendanceProcessingService } from '../attendance/services/attendance-processing.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { LeaveRequestType, LeaveStatus } from './enums/leave.enum';
import { LeaveRequest, Prisma } from '@prisma/client';
import { AccrualFrequency, AccrualMethod, LeaveTypeDto, HolidayEarnCategory } from '../policies/dto/leaves-policy.dto';

@Injectable()
export class LeavesService {
  private readonly logger = new Logger(LeavesService.name);

  constructor(
    public readonly prisma: PrismaService,
    private readonly policiesService: PoliciesService,
    private readonly attendanceProcessingService: AttendanceProcessingService,
  ) {}

  /**
   * Helper to fetch employee by userId
   */
  async getEmployeeByUserId(userId: string) {
    return this.prisma.employee.findFirst({
      where: { userId },
    });
  }

  /**
   * Calculate available leave balances for an employee
   */
  async getBalances(employeeId: string, currentDate: Date = new Date()) {
    this.logger.log(`Calculating balances for employee ${employeeId}`);

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { company: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }

    const policyDetail = await this.policiesService.getEffectivePolicyDetail(employeeId);
    const leaveTypes = (policyDetail.effective.leaves?.leaveTypes as unknown as LeaveTypeDto[]) || [];

    const balances: Array<{
      leaveTypeId: string;
      leaveTypeName: string;
      leaveTypeCode: string;
      entitled: number;
      used: number;
      pending: number;
      available: number;
      period: { start: Date; end: Date };
    }> = [];

    const calendarId = policyDetail.effective.calendarId;

    for (const leaveType of leaveTypes) {
      const period = this.calculatePeriod(leaveType.accrualFrequency, employee.joinedDate, currentDate);
      let entitled = this.calculateEntitlement(leaveType, employee.joinedDate, period);

      // Carry Over logic
      if (leaveType.canCarryOver) {
        const prevPeriod = this.getPreviousPeriod(leaveType.accrualFrequency, period.start);
        if (prevPeriod) {
          const prevEntitled = this.calculateEntitlement(leaveType, employee.joinedDate, prevPeriod);
          const prevEarned = await this.calculateEarnedLeave(employeeId, leaveType, prevPeriod, calendarId);
          const prevUsed = await this.calculateUsage(employeeId, leaveType.id, prevPeriod);
          
          const unused = Math.max(0, (prevEntitled + prevEarned) - prevUsed);
          const carryOver = Math.min(unused, leaveType.maxCarryOverDays || 0);
          entitled += carryOver;
        }
      }

      const earned = await this.calculateEarnedLeave(employeeId, leaveType, period, calendarId);
      entitled += earned;

      const used = await this.calculateUsage(employeeId, leaveType.id, period);
      const pending = await this.calculatePending(employeeId, leaveType.id, period);

      balances.push({
        leaveTypeId: leaveType.id,
        leaveTypeName: leaveType.name,
        leaveTypeCode: leaveType.code,
        entitled,
        used,
        pending,
        available: entitled - used - pending,
        period,
      });
    }

    return balances;
  }

  /**
   * Create a new leave request
   */
  async createRequest(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    return this.prisma.$transaction(async (tx) => {
      this.logger.log(`Creating leave request for employee ${dto.employeeId}`);

      const holidayId = dto.holidayId && dto.holidayId !== '' ? dto.holidayId : null;

      const employee = await tx.employee.findUnique({
        where: { id: dto.employeeId },
      });

      if (!employee) {
        throw new NotFoundException(`Employee ${dto.employeeId} not found`);
      }

      const policyDetail = await this.policiesService.getEffectivePolicyDetail(dto.employeeId);
      const leaveTypes = (policyDetail.effective.leaves?.leaveTypes as unknown as LeaveTypeDto[]) || [];
      const leaveType = leaveTypes.find((lt) => lt.id === dto.leaveTypeId);

      if (!leaveType) {
        throw new BadRequestException(`Leave type ${dto.leaveTypeId} not found in employee policy`);
      }

      const { days, minutes } = this.calculateDuration(dto, leaveType);
      const period = this.calculatePeriod(leaveType.accrualFrequency, employee.joinedDate, new Date(dto.startDate));
      const leaveNumber = await this.calculateLeaveNumber(dto.employeeId, dto.leaveTypeId, period);

      // Balance check
      const balances = await this.getBalances(dto.employeeId, new Date(dto.startDate));
      const balance = balances.find((b) => b.leaveTypeId === dto.leaveTypeId);

      if (!balance || balance.available < days) {
        const formatted = balance ? Number(balance.available).toFixed(1).replace(/\.0$/, '') : '0';
        throw new BadRequestException(`Insufficient leave balance. Available: ${formatted}, Requested: ${days}`);
      }

      if (dto.type === (LeaveRequestType.SHORT_LEAVE as any) && leaveType.isShortLeave) {
        if (minutes && leaveType.maxDurationMinutes && minutes > leaveType.maxDurationMinutes) {
          throw new BadRequestException(
            `Short leave duration exceeds maximum of ${leaveType.maxDurationMinutes} minutes`,
          );
        }
      }

      // 1. Overlap Check: Other Leave Requests
      const potentialOverlaps = await tx.leaveRequest.findMany({
        where: {
          employeeId: dto.employeeId,
          status: {
            in: [LeaveStatus.PENDING as any, LeaveStatus.APPROVED as any],
          },
          startDate: { lte: new Date(dto.endDate) },
          endDate: { gte: new Date(dto.startDate) },
        },
      });

      const reqStart = new Date(dto.startDate);
      const reqEnd = new Date(dto.endDate);
      const isReqFullDay = dto.type !== (LeaveRequestType.SHORT_LEAVE as any);

      const normReqStart = new Date(reqStart);
      const normReqEnd = new Date(reqEnd);
      if (isReqFullDay || dto.type === (LeaveRequestType.FULL_DAY as any)) {
        normReqStart.setUTCHours(0, 0, 0, 0);
        normReqEnd.setUTCHours(23, 59, 59, 999);
      }

      for (const existing of potentialOverlaps) {
        const exStart = new Date(existing.startDate);
        const exEnd = new Date(existing.endDate);
        const isExFullDay = existing.type !== (LeaveRequestType.SHORT_LEAVE as any);

        const normExStart = new Date(exStart);
        const normExEnd = new Date(exEnd);

        if (isExFullDay) {
          normExStart.setUTCHours(0, 0, 0, 0);
          normExEnd.setUTCHours(23, 59, 59, 999);
        }

        if (normReqStart < normExEnd && normReqEnd > normExStart) {
          throw new BadRequestException(
            `Leave request overlaps with an existing request (${existing.startDate.toLocaleDateString()} - ${existing.endDate.toLocaleDateString()})`,
          );
        }
      }

      // 2. Overlap Check: Existing Attendance Sessions
      // If employee has already clocked in on these days, they shouldn't apply for leave.
      const startDay = new Date(reqStart);
      startDay.setUTCHours(0, 0, 0, 0);
      const endDay = new Date(reqEnd);
      endDay.setUTCHours(23, 59, 59, 999);

      const existingSessions = await tx.attendanceSession.findMany({
        where: {
          employeeId: dto.employeeId,
          date: { gte: startDay, lte: endDay },
          OR: [{ inApprovalStatus: 'APPROVED' }, { outApprovalStatus: 'APPROVED' }],
        },
      });

      if (existingSessions.length > 0) {
        const firstDate = existingSessions[0].date.toLocaleDateString();
        throw new BadRequestException(
          `Leave cannot be requested for ${firstDate} because an approved attendance session already exists for that day.`,
        );
      }

      let documentsRequired = leaveType.requireDocuments;
      if (leaveType.requireDocumentsIfConsecutiveMoreThan && days > leaveType.requireDocumentsIfConsecutiveMoreThan) {
        documentsRequired = true;
      }

      if (documentsRequired && (!dto.documents || dto.documents.length === 0)) {
        throw new BadRequestException('Supporting documents are required for this leave request.');
      }

      if (leaveType.isHolidayReplacement) {
        if (!holidayId) {
          throw new BadRequestException('This leave type requires selecting the holiday you worked on.');
        }

        const holiday = await tx.holiday.findUnique({
          where: { id: holidayId },
        });

        if (!holiday) {
          throw new BadRequestException('Selected holiday not found.');
        }

        const session = await tx.attendanceSession.findFirst({
          where: {
            employeeId: dto.employeeId,
            date: holiday.date,
            OR: [{ inApprovalStatus: 'APPROVED' }, { outApprovalStatus: 'APPROVED' }],
          },
        });

        if (!session) {
          throw new BadRequestException(
            `No approved attendance found on ${holiday.date.toLocaleDateString()} (${holiday.name}). You must work on a holiday to claim this leave.`,
          );
        }

        const alreadyUsed = await tx.leaveRequest.findFirst({
          where: {
            employeeId: dto.employeeId,
            holidayId: holidayId,
            status: { in: [LeaveStatus.PENDING as any, LeaveStatus.APPROVED as any] },
          },
        });

        if (alreadyUsed) {
          throw new BadRequestException(
            `This holiday (${holiday.name}) has already been used for another leave request.`,
          );
        }
      }

      return tx.leaveRequest.create({
        data: {
          employeeId: dto.employeeId,
          companyId: dto.companyId,
          leaveTypeId: dto.leaveTypeId,
          leaveTypeName: leaveType.name,
          type: dto.type as any,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          days,
          minutes,
          leaveNumber,
          reason: dto.reason,
          documents: (dto.documents || []) as any,
          status: LeaveStatus.PENDING as any,
          holidayId: holidayId,
        },
      });
    });
  }

  /**
   * Update leave request (approve/reject)
   */
  async updateRequest(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest> {
    this.logger.log(`Updating leave request ${id}`);

    const request = await this.prisma.leaveRequest.findUnique({ where: { id } });

    if (!request) {
      throw new NotFoundException(`Leave request ${id} not found`);
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: dto.status as any,
        responseReason: dto.responseReason,
        managerId: dto.managerId,
      },
    });

    // If approved, reprocess attendance for the affected dates
    if (updated.status === (LeaveStatus.APPROVED as any)) {
      const start = new Date(updated.startDate);
      const end = new Date(updated.endDate);
      const current = new Date(start);

      while (current <= end) {
        // We use a copy of the date to avoid side effects
        const processDate = new Date(current);
        void this.attendanceProcessingService.processEmployeeDate(updated.employeeId, processDate).catch((err) => {
          this.logger.error(`Failed to reprocess attendance for ${updated.employeeId} on ${processDate.toISOString()}: ${err.message}`);
        });
        current.setDate(current.getDate() + 1);
      }
    }

    return updated;
  }

  /**
   * Delete a leave request (only pending requests can be deleted)
   */
  async deleteRequest(id: string): Promise<{ message: string }> {
    this.logger.log(`Deleting leave request ${id}`);

    const request = await this.prisma.leaveRequest.findUnique({ where: { id } });

    if (!request) {
      throw new NotFoundException(`Leave request ${id} not found`);
    }

    if (request.status !== (LeaveStatus.PENDING as any)) {
      throw new BadRequestException(
        `Cannot delete leave request with status ${request.status}. Only pending requests can be deleted.`,
      );
    }

    await this.prisma.leaveRequest.delete({ where: { id } });

    return { message: 'Leave request deleted successfully' };
  }

  /**
   * Get all leave requests for a company
   */
  async findAll(companyId: string, filters?: { status?: LeaveStatus; employeeId?: string }) {
    return this.prisma.leaveRequest.findMany({
      where: {
        companyId,
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.employeeId && { employeeId: filters.employeeId }),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNo: true,
            nameWithInitials: true,
            fullName: true,
            photo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single leave request
   */
  async findOne(id: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`Leave request ${id} not found`);
    }

    return request;
  }

  // ===== HELPER METHODS =====

  private calculatePeriod(frequency: AccrualFrequency, joinedDate: Date, currentDate: Date) {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    switch (frequency) {
      case AccrualFrequency.MONTHLY:
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 0);
        break;
      case AccrualFrequency.YEARLY:
        start.setMonth(0, 1);
        end.setMonth(11, 31);
        break;
      case AccrualFrequency.QUARTERLY: {
        const quarter = Math.floor(currentDate.getMonth() / 3);
        start.setMonth(quarter * 3, 1);
        end.setMonth(quarter * 3 + 3, 0);
        break;
      }
      default:
        start.setMonth(0, 1);
        end.setMonth(11, 31);
    }

    return { start, end };
  }

  private getPreviousPeriod(frequency: AccrualFrequency, currentPeriodStart: Date) {
    const start = new Date(currentPeriodStart);
    const end = new Date(currentPeriodStart);

    // Go back 1 day from the start of the current period to get into the previous period
    const prevDate = new Date(currentPeriodStart);
    prevDate.setDate(prevDate.getDate() - 1);

    switch (frequency) {
      case AccrualFrequency.MONTHLY:
        start.setMonth(start.getMonth() - 1, 1);
        end.setDate(0); // Last day of previous month
        break;
      case AccrualFrequency.YEARLY:
        start.setFullYear(start.getFullYear() - 1, 0, 1);
        end.setFullYear(end.getFullYear() - 1, 11, 31);
        break;
      case AccrualFrequency.QUARTERLY: {
        start.setMonth(start.getMonth() - 3, 1);
        end.setDate(0); // Last day of previous month
        break;
      }
      default:
        return null;
    }

    return { start, end };
  }

  private calculateEntitlement(leaveType: LeaveTypeDto, joinedDate: Date, period: { start: Date; end: Date }): number {
    let entitlement = leaveType.baseAmount;

    if (leaveType.accrualMethod === AccrualMethod.PRO_RATA && joinedDate > period.start) {
      const totalDays = (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24);
      const remainingDays = (period.end.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24);
      entitlement = (leaveType.baseAmount * remainingDays) / totalDays;
    }

    return Math.round(entitlement * 10) / 10;
  }

  private async calculateUsage(
    employeeId: string,
    leaveTypeId: string,
    period: { start: Date; end: Date },
  ): Promise<number> {
    const result = await this.prisma.leaveRequest.aggregate({
      where: {
        employeeId,
        leaveTypeId,
        status: LeaveStatus.APPROVED as any,
        startDate: { gte: period.start },
        endDate: { lte: period.end },
      },
      _sum: { days: true },
    });

    return result._sum.days || 0;
  }

  private async calculatePending(
    employeeId: string,
    leaveTypeId: string,
    period: { start: Date; end: Date },
  ): Promise<number> {
    const result = await this.prisma.leaveRequest.aggregate({
      where: {
        employeeId,
        leaveTypeId,
        status: LeaveStatus.PENDING as any,
        startDate: { gte: period.start },
        endDate: { lte: period.end },
      },
      _sum: { days: true },
    });

    return result._sum.days || 0;
  }

  private async calculateLeaveNumber(
    employeeId: string,
    leaveTypeId: string,
    period: { start: Date; end: Date },
  ): Promise<number> {
    const count = await this.prisma.leaveRequest.count({
      where: {
        employeeId,
        leaveTypeId,
        startDate: { gte: period.start },
        endDate: { lte: period.end },
      },
    });

    return count + 1;
  }

  private calculateDuration(
    dto: CreateLeaveRequestDto,
    leaveType: LeaveTypeDto,
  ): { days: number; minutes: number | null } {
    if (dto.type === (LeaveRequestType.SHORT_LEAVE as any)) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      return { days: 0, minutes };
    }

    if (dto.type === (LeaveRequestType.HALF_DAY_FIRST as any) || dto.type === (LeaveRequestType.HALF_DAY_LAST as any)) {
      return { days: 0.5, minutes: null };
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    let days = 0;

    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
    }

    return { days, minutes: null };
  }

  private async calculateEarnedLeave(
    employeeId: string,
    leaveType: LeaveTypeDto,
    period: { start: Date; end: Date },
    calendarId?: string,
  ): Promise<number> {
    if (!leaveType.isHolidayReplacement || !leaveType.earnedOnHolidayCategories?.length) {
      return 0;
    }

    if (!calendarId) return 0;

    const categories = leaveType.earnedOnHolidayCategories || [];
    const conditions: Prisma.HolidayWhereInput[] = [];
    
    if (categories.includes(HolidayEarnCategory.PUBLIC)) conditions.push({ isPublic: true });
    if (categories.includes(HolidayEarnCategory.MERCANTILE)) conditions.push({ isMercantile: true });
    if (categories.includes(HolidayEarnCategory.BANK)) conditions.push({ isBank: true });

    if (conditions.length === 0) return 0;

    const holidays = await this.prisma.holiday.findMany({
      where: {
        calendarId,
        date: { gte: period.start, lte: period.end },
        OR: conditions,
      },
      select: { date: true },
    });

    if (holidays.length === 0) return 0;

    const holidayDates = holidays.map((h) => h.date);

    const sessions = await this.prisma.attendanceSession.count({
      where: {
        employeeId,
        date: { in: holidayDates },
        OR: [{ inApprovalStatus: 'APPROVED' }, { outApprovalStatus: 'APPROVED' }],
      },
    });

    return sessions;
  }
}
