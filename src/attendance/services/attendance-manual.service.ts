import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { TimeService } from './time.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceProcessingService } from './attendance-processing.service';
import { AttendanceCalculationService } from './attendance-calculation.service';
import { LeaveIntegrationService } from './leave-integration.service';
import { PoliciesService } from '../../policies/policies.service';
import { CreateEventDto } from '../dto/event.dto';
import { UpdateSessionDto, CreateSessionDto } from '../dto/session.dto';
import { EventSource, AttendanceEvent, AttendanceSession, EventType, Prisma } from '@prisma/client';
import { ProcessingContext } from '../types/processing-context.types';
import { AttendanceWorkTimeService } from './attendance-work-time.service';
import { AttendanceHolidayService } from './attendance-holiday.service';
import { PolicySettingsDto, ShiftDto } from '../../policies/dto/policy-settings.dto';

@Injectable()
export class AttendanceManualService {
  private readonly logger = new Logger(AttendanceManualService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processingService: AttendanceProcessingService,
    private readonly calculationService: AttendanceCalculationService,
    private readonly policiesService: PoliciesService,
    private readonly leaveService: LeaveIntegrationService,
    private readonly timeService: TimeService,
    private readonly workTimeService: AttendanceWorkTimeService,
    private readonly holidayService: AttendanceHolidayService,
  ) {}

  /**
   * Create manual event (from employer portal)
   */
  async createManualEvent(dto: CreateEventDto, source: EventSource = 'MANUAL'): Promise<AttendanceEvent> {
    this.logger.log(`Creating ${source} event for employee ${dto.employeeId || dto.employeeNo}`);

    const employeeId = dto.employeeId;
    if (!employeeId) {
      throw new BadRequestException('employeeId required');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { company: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const timezone = employee.company?.timezone || 'Asia/Colombo';
    const eventTime = this.timeService.parseDateTimeWithTimezone(dto.eventTime, timezone);

    const event = await this.prisma.attendanceEvent.create({
      data: {
        employeeId,
        companyId: employee.companyId,
        eventTime,
        eventType: dto.eventType || 'IN',
        source,
        device: dto.device || 'Manual Entry',
        location: dto.location,
        latitude: dto.latitude,
        longitude: dto.longitude,
        remark: dto.remark,
        status: 'ACTIVE',
      },
    });

    const eventDate = eventTime;
    try {
      const [policy, leaves] = await Promise.all([
        this.policiesService.getEffectivePolicy(employeeId),
        this.leaveService.getApprovedLeaves(employeeId, eventDate),
      ]);

      const context: ProcessingContext = {
        employee,
        policy: policy as unknown as PolicySettingsDto,
        leaves: leaves as any,
        timezone: employee.company?.timezone || 'UTC',
      };

      await this.processingService.processEmployeeDate(employeeId, eventDate, context);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process manual event: ${msg}`);
    }

    return event;
  }

  /**
   * Create manual attendance session
   */
  async createManualSession(dto: CreateSessionDto): Promise<AttendanceSession> {
    const { employeeId, date, shiftId } = dto;

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { company: true },
    });

    if (!employee) throw new NotFoundException('Employee not found');
    const timezone = employee.company?.timezone || 'UTC';

    const sessionDate = this.timeService.getLogicalDate(new Date(date), timezone);

    const existing = await this.prisma.attendanceSession.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: sessionDate,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Session already exists for this date');
    }

    const session = await this.prisma.attendanceSession.create({
      data: {
        employeeId,
        companyId: employee.companyId,
        date: sessionDate,
        shiftId,
        manuallyEdited: true,
        inApprovalStatus: 'APPROVED',
        outApprovalStatus: 'APPROVED',
      },
    });

    const [policy, leaves] = await Promise.all([
      this.policiesService.getEffectivePolicy(employeeId),
      this.leaveService.getApprovedLeaves(employeeId, sessionDate),
    ]);

    const context: ProcessingContext = {
      employee,
      policy: policy as unknown as PolicySettingsDto,
      leaves: leaves as any,
      timezone,
    };

    await this.processingService.processEmployeeDate(employeeId, sessionDate, context);

    return this.prisma.attendanceSession.findUniqueOrThrow({ where: { id: session.id } });
  }

  /**
   * Update session (Manual Edit)
   */
  async updateSession(id: string, dto: UpdateSessionDto): Promise<AttendanceSession> {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id },
    });

    if (!session) throw new NotFoundException('Session not found');

    const editFields = [
      'checkInTime',
      'checkOutTime',
      'shiftId',
      'workDayStatus',
      'isLate',
      'isEarlyLeave',
      'isOnLeave',
      'isHalfDay',
      'hasShortLeave',
      'totalMinutes',
      'breakMinutes',
      'workMinutes',
      'overtimeMinutes',
      'isBreakOverrideActive',
    ];

    const hasEditField = Object.keys(dto).some((key) => editFields.includes(key));

    const employee = await this.prisma.employee.findUnique({
      where: { id: session.employeeId },
      include: { company: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    const timezone = employee.company?.timezone || 'Asia/Colombo';

    const updateData: Prisma.AttendanceSessionUncheckedUpdateInput = {
      ...dto,
      checkInTime:
        dto.checkInTime === null
          ? null
          : dto.checkInTime
            ? this.timeService.parseDateTimeWithTimezone(dto.checkInTime, timezone)
            : undefined,
      checkOutTime:
        dto.checkOutTime === null
          ? null
          : dto.checkOutTime
            ? this.timeService.parseDateTimeWithTimezone(dto.checkOutTime, timezone)
            : undefined,
      shiftId: dto.shiftId === '' ? null : dto.shiftId,
    };

    if (hasEditField) {
      updateData.manuallyEdited = true;
    }

    if (updateData.checkInTime) {
      const dateObj = updateData.checkInTime as Date;
      const newDate = this.timeService.getLogicalDate(dateObj, timezone);

      if (newDate.getTime() !== session.date.getTime()) {
        const conflict = await this.prisma.attendanceSession.findUnique({
          where: { employeeId_date: { employeeId: session.employeeId, date: newDate } },
        });
        if (conflict && conflict.id !== id) {
          throw new BadRequestException('Session already exists on this date');
        }
        updateData.date = newDate;
      }
    }

    const effectiveIn = (
      updateData.checkInTime !== undefined ? updateData.checkInTime : session.checkInTime
    ) as Date | null;
    const effectiveOut = (
      updateData.checkOutTime !== undefined ? updateData.checkOutTime : session.checkOutTime
    ) as Date | null;
    const effectiveShiftId =
      dto.shiftId !== undefined ? (dto.shiftId === 'none' ? null : dto.shiftId) : session.shiftId;
    const effectiveDate = (updateData.date as Date) || session.date;

    const policy = await this.policiesService.getEffectivePolicy(session.employeeId);
    const policySettings = policy as unknown as PolicySettingsDto;

    const workCalId =
      policySettings.workingDays?.workingCalendar || policySettings.attendance?.calendarId || policySettings.calendarId;
    const payCalId =
      policySettings.workingDays?.payrollCalendar ||
      policySettings.payrollConfiguration?.calendarId ||
      policySettings.calendarId;

    let calcShift: ShiftDto | null = null;
    if (effectiveShiftId) {
      calcShift = policySettings.shifts?.list?.find((s) => s.id === effectiveShiftId) || null;
    }

    const [leaves, holidayIds] = await Promise.all([
      this.leaveService.getApprovedLeaves(session.employeeId, effectiveDate),
      this.holidayService.resolveHolidays(effectiveDate, workCalId, payCalId),
    ]);

    const effectiveOverride =
      dto.isBreakOverrideActive !== undefined ? dto.isBreakOverrideActive : session.isBreakOverrideActive;

    let breakMins: number;
    if (effectiveOverride) {
      breakMins = dto.breakMinutes ?? session.breakMinutes ?? 0;
    } else {
      const events = await this.prisma.attendanceEvent.findMany({
        where: { sessionId: id },
        orderBy: { eventTime: 'asc' },
      });
      const calculated = this.workTimeService.calculateBreaksFromEvents(events);
      breakMins = Math.max(calculated.breakMinutes, calcShift?.breakTime ?? session.shiftBreakMinutes ?? 0);
    }

    const context: ProcessingContext = {
      employee,
      policy: policySettings,
      leaves: leaves as any,
      timezone,
    };

    const calculation = await this.calculationService.calculate(
      { checkInTime: effectiveIn, checkOutTime: effectiveOut, shiftBreakMinutes: breakMins, date: effectiveDate },
      calcShift,
      leaves as any,
      timezone,
      policySettings,
      context,
    );

    updateData.isLate = calculation.isLate;
    updateData.lateMinutes = calculation.lateMinutes;
    updateData.isEarlyLeave = calculation.isEarlyLeave;
    updateData.earlyLeaveMinutes = calculation.earlyLeaveMinutes;
    updateData.isOnLeave = calculation.isOnLeave;
    updateData.isHalfDay = calculation.isHalfDay;
    updateData.hasShortLeave = calculation.hasShortLeave;
    updateData.workDayStatus = this.holidayService.determineWorkDayStatus(effectiveDate, policySettings) as any;
    updateData.totalMinutes = calculation.totalMinutes;
    updateData.workMinutes = dto.workMinutes !== undefined ? dto.workMinutes : calculation.workMinutes;
    updateData.breakMinutes = effectiveOverride
      ? (dto.breakMinutes ?? session.breakMinutes ?? calculation.breakMinutes)
      : calculation.breakMinutes;
    updateData.overtimeMinutes = dto.overtimeMinutes !== undefined ? dto.overtimeMinutes : calculation.overtimeMinutes;

    if (dto.shiftId !== undefined) {
      if (dto.shiftId === null || dto.shiftId === 'none') {
        updateData.shiftName =
          updateData.shiftStartTime =
          updateData.shiftEndTime =
          updateData.shiftBreakMinutes =
          updateData.shiftId =
            null;
      } else if (calcShift) {
        updateData.shiftName = calcShift.name;
        updateData.shiftStartTime = calcShift.startTime;
        updateData.shiftEndTime = calcShift.endTime;
        updateData.shiftBreakMinutes = calcShift.breakTime;
      }
    }

    updateData.workHolidayId = holidayIds.workHolidayId;
    updateData.payrollHolidayId = holidayIds.payrollHolidayId;

    return this.prisma.attendanceSession.update({ where: { id }, data: updateData });
  }

  /**
   * Delete session
   */
  async deleteSession(id: string): Promise<{ message: string }> {
    const session = await this.prisma.attendanceSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.attendanceEvent.updateMany({
      where: { sessionId: id },
      data: { sessionId: null, status: 'IGNORED' },
    });

    await this.prisma.attendanceSession.delete({ where: { id } });
    return { message: 'Session deleted successfully' };
  }

  async linkEventToSession(eventId: string, sessionId: string): Promise<void> {
    const event = await this.prisma.attendanceEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    const session = await this.prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.attendanceEvent.update({ where: { id: eventId }, data: { sessionId } });
    void this.processingService.processEmployeeDate(session.employeeId, session.date);
  }

  async unlinkEventFromSession(eventId: string): Promise<void> {
    const event = await this.prisma.attendanceEvent.findUnique({ where: { id: eventId }, include: { session: true } });
    if (!event) throw new NotFoundException('Event not found');

    const oldSession = event.session;
    await this.prisma.attendanceEvent.update({ where: { id: eventId }, data: { sessionId: null } });

    if (oldSession) {
      void this.processingService.processEmployeeDate(oldSession.employeeId, oldSession.date);
    }
  }

  async updateEventType(eventId: string, eventType: EventType): Promise<void> {
    const event = await this.prisma.attendanceEvent.findUnique({
      where: { id: eventId },
      include: { session: true },
    });

    if (!event) throw new NotFoundException('Event not found');

    await this.prisma.attendanceEvent.update({
      where: { id: eventId },
      data: { eventType },
    });

    void this.processingService.processEmployeeDate(event.employeeId, new Date(event.eventTime));

    if (event.session && event.session.date.getTime() !== new Date(event.eventTime).setUTCHours(0, 0, 0, 0)) {
      void this.processingService.processEmployeeDate(event.employeeId, event.session.date);
    }
  }
}
