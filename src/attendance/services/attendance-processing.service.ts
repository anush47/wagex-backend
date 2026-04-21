import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShiftSelectionService } from './shift-selection.service';
import { AttendanceCalculationService } from './attendance-calculation.service';
import { LeaveIntegrationService } from './leave-integration.service';
import { AttendanceEvent, AttendanceSession, ApprovalStatus, Prisma } from '@prisma/client';
import { PoliciesService } from '../../policies/policies.service';
import { ApprovalPolicyMode } from '../../policies/dto/attendance-policy.dto';
import { SessionGroupingService, SessionGroup } from './session-grouping.service';
import { TimeService } from './time.service';
import { ProcessingContext } from '../types/processing-context.types';
import { AttendanceHolidayService } from './attendance-holiday.service';
import { AttendanceCalculationResult } from './attendance-calculation.service';
import { ShiftDto } from '../../policies/dto/shifts-policy.dto';
import { PolicySettingsDto } from '../../policies/dto/policy-settings.dto';

@Injectable()
export class AttendanceProcessingService {
  private readonly logger = new Logger(AttendanceProcessingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shiftService: ShiftSelectionService,
    private readonly calculationService: AttendanceCalculationService,
    private readonly leaveService: LeaveIntegrationService,
    private readonly policiesService: PoliciesService,
    private readonly sessionGroupingService: SessionGroupingService,
    private readonly timeService: TimeService,
    private readonly holidayService: AttendanceHolidayService,
  ) {}

  /**
   * Process events for a specific employee and date
   * This is called automatically when events are inserted
   */
  async processEmployeeDate(employeeId: string, date: Date, context?: ProcessingContext): Promise<AttendanceSession[]> {
    let timezone: string = context?.timezone || 'UTC';
    if (!context?.timezone) {
      const employee =
        context?.employee ||
        (await this.prisma.employee.findUnique({
          where: { id: employeeId },
          include: { company: true },
        }));
      timezone = employee?.company?.timezone || 'UTC';
    }

    this.logger.log(`Processing attendance for employee ${employeeId} on ${date.toISOString()} in ${timezone}`);

    const events = await this.sessionGroupingService.getEventsForSessionGrouping(employeeId, date, timezone);

    if (events.length === 0) {
      this.logger.warn(`No events found for employee ${employeeId} around ${date.toISOString()}`);
      return [];
    }

    const sessionGroups = await this.sessionGroupingService.groupEventsIntoSessions(employeeId, events, date, timezone);

    if (sessionGroups.length === 0) {
      this.logger.warn(`No session groups created for employee ${employeeId} around ${date.toISOString()}`);
      return [];
    }

    this.logger.log(`[PROCESSING] Found ${sessionGroups.length} session groups for ${employeeId}`);

    const sessions: AttendanceSession[] = [];
    for (const sessionGroup of sessionGroups) {
      const { shift } = context?.shift
        ? { shift: context.shift }
        : await this.shiftService.getEffectiveShift(employeeId, sessionGroup.firstIn || date, timezone);

      if (!shift) {
        this.logger.warn(`No effective shift found for employee ${employeeId} on ${sessionGroup.sessionDate.toISOString()}. Late/Early/OT calculations may be affected.`);
      }

      const leaves =
        context?.leaves || (await this.leaveService.getApprovedLeaves(employeeId, sessionGroup.sessionDate));

      const effectivePolicy = context?.policy || (await this.policiesService.getEffectivePolicy(employeeId));

      const calculation = await this.calculationService.calculate(
        { sessionGroup },
        shift,
        leaves as any,
        timezone,
        effectivePolicy || undefined,
        context,
      );

      const session = await this.createOrUpdateSessionFromGroup(
        employeeId,
        sessionGroup,
        shift,
        calculation,
        effectivePolicy || undefined,
        context,
      );

      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Create or update attendance session from session group
   */
  private async createOrUpdateSessionFromGroup(
    employeeId: string,
    sessionGroup: SessionGroup,
    shift: ShiftDto | null,
    calculation: AttendanceCalculationResult,
    policy?: PolicySettingsDto,
    context?: ProcessingContext,
  ): Promise<AttendanceSession> {
    const employeeRecord =
      context?.employee ||
      (await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, companyId: true },
      }));

    if (!employeeRecord) {
      throw new Error('Employee not found');
    }

    const effectivePolicy = policy || context?.policy || (await this.policiesService.getEffectivePolicy(employeeId));
    const approvalConfig = effectivePolicy?.attendance?.approvalPolicy;

    const firstInEvent = sessionGroup.events.find((e) => e.eventType === 'IN');
    const lastOutEvent = [...sessionGroup.events].reverse().find((e) => e.eventType === 'OUT');

    const determineApproval = (event?: AttendanceEvent, isLate?: boolean) => {
      if (!event || !approvalConfig || approvalConfig.mode === ApprovalPolicyMode.AUTO_APPROVE) {
        return ApprovalStatus.APPROVED;
      }

      if (event.source === 'MANUAL') return ApprovalStatus.PENDING;

      switch (approvalConfig.mode) {
        case ApprovalPolicyMode.REQUIRE_APPROVAL_ALL:
          return ApprovalStatus.PENDING;
        case ApprovalPolicyMode.REQUIRE_APPROVAL_EXCEPTIONS:
          if (
            isLate &&
            (approvalConfig.exceptionTriggers?.deviceMismatch || approvalConfig.exceptionTriggers?.outsideZone)
          ) {
            return ApprovalStatus.PENDING;
          }
          return ApprovalStatus.APPROVED;
        default:
          return ApprovalStatus.APPROVED;
      }
    };

    const inApprovalStatus = determineApproval(firstInEvent, calculation.isLate);
    const outApprovalStatus = determineApproval(lastOutEvent, calculation.isEarlyLeave);

    const workDayStatus = effectivePolicy
      ? this.holidayService.determineWorkDayStatus(sessionGroup.sessionDate, effectivePolicy)
      : calculation.isHalfDay
        ? 'HALF_FIRST'
        : 'FULL';

    let workHolidayId: string | null = null;
    let payrollHolidayId: string | null = null;

    if (effectivePolicy) {
      const workCalendarId =
        effectivePolicy.workingDays?.workingCalendar ||
        effectivePolicy.attendance?.calendarId ||
        effectivePolicy.calendarId;
      const payrollCalendarId =
        effectivePolicy.workingDays?.payrollCalendar ||
        effectivePolicy.payrollConfiguration?.calendarId ||
        effectivePolicy.calendarId;

      const holidays = await this.holidayService.resolveHolidays(
        sessionGroup.sessionDate,
        workCalendarId,
        payrollCalendarId,
        context,
      );
      workHolidayId = holidays.workHolidayId;
      payrollHolidayId = holidays.payrollHolidayId;
    }

    const sessionData: Prisma.AttendanceSessionUncheckedCreateInput = {
      employeeId,
      companyId: employeeRecord.companyId,
      date: sessionGroup.sessionDate,
      shiftId: shift?.id || null,
      shiftName: shift?.name || null,
      shiftStartTime: shift?.startTime || null,
      shiftEndTime: shift?.endTime || null,
      shiftBreakMinutes: shift?.breakTime || null,
      checkInTime: sessionGroup.firstIn || null,
      checkOutTime: sessionGroup.lastOut || null,
      checkInLocation: firstInEvent?.location || null,
      checkInLatitude: firstInEvent?.latitude || null,
      checkInLongitude: firstInEvent?.longitude || null,
      checkOutLocation: lastOutEvent?.location || null,
      checkOutLatitude: lastOutEvent?.latitude || null,
      checkOutLongitude: lastOutEvent?.longitude || null,
      totalMinutes: calculation.totalMinutes,
      breakMinutes: calculation.breakMinutes,
      workMinutes: calculation.workMinutes,
      overtimeMinutes: calculation.overtimeMinutes,
      isLate: calculation.isLate,
      lateMinutes: calculation.lateMinutes,
      isEarlyLeave: calculation.isEarlyLeave,
      earlyLeaveMinutes: calculation.earlyLeaveMinutes,
      isOnLeave: calculation.isOnLeave,
      isHalfDay: calculation.isHalfDay,
      hasShortLeave: calculation.hasShortLeave,
      manuallyEdited: false,
      autoCheckout: false,
      additionalInOutCount: sessionGroup.additionalInOutPairs.length,
      workDayStatus: workDayStatus as any,
      inApprovalStatus,
      outApprovalStatus,
      workHolidayId,
      payrollHolidayId,
    };

    let session = await this.prisma.attendanceSession.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: sessionGroup.sessionDate,
        },
      },
    });

    if (session) {
      await this.prisma.attendanceEvent.updateMany({
        where: { id: { in: sessionGroup.events.map((e) => e.id) } },
        data: { sessionId: session.id },
      });

      if (session.manuallyEdited) {
        const { manuallyEdited: _, ...rest } = sessionData;
        const manualUpdateData: Prisma.AttendanceSessionUncheckedUpdateInput = {
          ...rest,
          checkInTime: session.checkInTime || sessionData.checkInTime,
          checkOutTime: session.checkOutTime || sessionData.checkOutTime,
        };

        session = await this.prisma.attendanceSession.update({
          where: { id: session.id },
          data: manualUpdateData,
        });

        return session;
      }
    }

    session = await this.prisma.attendanceSession.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: sessionGroup.sessionDate,
        },
      },
      create: sessionData as any,
      update: sessionData as any,
    });

    await this.prisma.attendanceEvent.updateMany({
      where: { id: { in: sessionGroup.events.map((e) => e.id) } },
      data: { sessionId: session.id },
    });

    return session;
  }

  /**
   * Process events for a date range
   * Useful for bulk processing or recalculation
   */
  async processDateRange(companyId: string, startDate: Date, endDate: Date): Promise<void> {
    const employees = await this.prisma.employee.findMany({
      where: { companyId },
      select: { id: true },
    });

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      for (const employee of employees) {
        void this.processEmployeeDate(employee.id, new Date(currentDate)).catch((error) => {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Error processing bulk for employee ${employee.id}: ${msg}`);
        });
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }
}
