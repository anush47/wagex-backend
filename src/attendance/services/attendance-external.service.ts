import { Injectable, Logger, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceProcessingService } from './attendance-processing.service';
import { CreateEventDto, BulkCreateEventsDto } from '../dto/event.dto';
import { AttendanceEvent, EventType, Prisma } from '@prisma/client';
import { ShiftSelectionService } from './shift-selection.service';
import { PoliciesService } from '../../policies/policies.service';
import { TimeService } from './time.service';
import { ProcessingContext } from '../types/processing-context.types';
import { PolicySettingsDto } from '../../policies/dto/policy-settings.dto';

export interface ApiKeyVerificationResult {
  valid: boolean;
  type?: 'COMPANY' | 'EMPLOYEE' | 'TEMPLATE';
  policyId?: string;
  company?: { id: string; name: string; employerNumber?: string; timezone?: string };
  employee?: { id: string; name: string; employeeNo: number };
  apiKey?: { id: string; name: string; lastUsedAt: Date };
  restrictedToPolicyId?: string | null;
}

interface RawApiKeyQueryResult {
  policyId: string;
  settings: Prisma.JsonValue;
  companyId: string;
  isDefault: boolean;
  companyName: string;
  employerNumber: string | null;
  timezone: string;
  empCount: number;
  empId: string | null;
  empName: string | null;
  empNo: number | null;
}

@Injectable()
export class AttendanceExternalService {
  private readonly logger = new Logger(AttendanceExternalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processingService: AttendanceProcessingService,
    private readonly shiftSelectionService: ShiftSelectionService,
    private readonly timeService: TimeService,
    private readonly policiesService: PoliciesService,
  ) {}

  private apiKeyCache = new Map<string, { result: ApiKeyVerificationResult; expiresAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  /**
   * Verify API key using GIN index optimized query with in-memory caching
   */
  async verifyApiKey(apiKey: string): Promise<ApiKeyVerificationResult> {
    const cached = this.apiKeyCache.get(apiKey);
    if (cached && cached.expiresAt > Date.now()) {
      if (cached.result.valid && cached.result.policyId) {
        void this.throttleLastUsedUpdate(apiKey, cached.result.policyId);
      }
      return cached.result;
    }

    try {
      const queryValue = JSON.stringify([{ key: apiKey }]);
      const results = await this.prisma.$queryRaw<RawApiKeyQueryResult[]>`
                SELECT
                    p.id                  AS "policyId",
                    p.settings,
                    p."companyId",
                    p."isDefault",
                    c.name                AS "companyName",
                    c."employerNumber",
                    c."timezone",
                    emp_agg."empCount",
                    emp_agg."empId",
                    emp_agg."empName",
                    emp_agg."empNo"
                FROM public.policies p
                LEFT JOIN public.companies c ON p."companyId" = c.id
                LEFT JOIN LATERAL (
                    SELECT
                        COUNT(*)::int              AS "empCount",
                        MIN(e.id)                  AS "empId",
                        MIN(e."nameWithInitials")   AS "empName",
                        MIN(e."employeeNo")         AS "empNo"
                    FROM public.employees e
                    WHERE e."policyId" = p.id
                      AND p."isDefault" = false
                ) emp_agg ON true
                WHERE (p.settings -> 'attendance' -> 'apiKeys') @> ${queryValue}::jsonb
                LIMIT 1
            `;

      if (!results || results.length === 0) {
        return { valid: false };
      }

      const policy = results[0];
      const settings = policy.settings as unknown as PolicySettingsDto;
      const keyConfig = settings.attendance?.apiKeys?.find((k) => k.key === apiKey);

      if (!keyConfig || (keyConfig as any).enabled === false) {
        return { valid: false };
      }

      let employeeInfo: { id: string; name: string; employeeNo: number } | undefined;
      if (!policy.isDefault && policy.empCount === 1 && policy.empId) {
        employeeInfo = {
          id: policy.empId,
          name: policy.empName || '',
          employeeNo: policy.empNo || 0,
        };
      }

      const result: ApiKeyVerificationResult = {
        valid: true,
        type: policy.isDefault ? 'COMPANY' : employeeInfo ? 'EMPLOYEE' : 'TEMPLATE',
        policyId: policy.policyId,
        company: {
          id: policy.companyId,
          name: policy.companyName,
          employerNumber: policy.employerNumber || undefined,
          timezone: policy.timezone,
        },
        apiKey: {
          id: keyConfig.id,
          name: keyConfig.name,
          lastUsedAt: new Date(),
        },
        employee: employeeInfo,
        restrictedToPolicyId: policy.isDefault ? null : policy.policyId,
      };

      this.apiKeyCache.set(apiKey, {
        result,
        expiresAt: Date.now() + this.CACHE_TTL,
      });

      void this.throttleLastUsedUpdate(apiKey, policy.policyId);

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Database error during API key verification: ${msg}`);
    }

    return { valid: false };
  }

  private lastUpdateMap = new Map<string, number>();

  private async throttleLastUsedUpdate(apiKey: string, policyId: string) {
    const now = Date.now();
    const lastUpdate = this.lastUpdateMap.get(apiKey) || 0;

    if (now - lastUpdate < 30 * 60 * 1000) return;

    this.lastUpdateMap.set(apiKey, now);

    try {
      await this.prisma.$executeRaw`
                UPDATE public.policies
                SET settings = jsonb_set(
                    settings,
                    '{attendance,apiKeys}',
                    (
                        SELECT jsonb_agg(
                            CASE 
                                WHEN elem ->> 'key' = ${apiKey} 
                                THEN jsonb_set(elem, '{lastUsedAt}', to_jsonb(${new Date().toISOString()}::text))
                                ELSE elem 
                            END
                        )
                        FROM jsonb_array_elements(settings -> 'attendance' -> 'apiKeys') AS elem
                    )
                )
                WHERE id = ${policyId}
            `;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update lastUsedAt for key: ${msg}`);
    }
  }

  /**
   * Validate time interval between consecutive events
   */
  async validateEventTiming(
    employeeId: string,
    eventTime: Date,
    eventType: EventType,
    policy: PolicySettingsDto,
    lastEventContext?: { eventTime: Date; eventType: EventType },
  ): Promise<void> {
    const minInToOut = policy.attendance?.minInToOutMinutes ?? 10;
    const minOutToIn = policy.attendance?.minOutToInSeconds ?? 30;

    let lastEvent = lastEventContext;
    if (!lastEvent) {
      const dbLastEvent = await this.prisma.attendanceEvent.findFirst({
        where: { employeeId, status: 'ACTIVE' },
        orderBy: { eventTime: 'desc' },
        select: { eventTime: true, eventType: true },
      });
      if (dbLastEvent) {
        lastEvent = {
          eventTime: new Date(dbLastEvent.eventTime),
          eventType: dbLastEvent.eventType as EventType,
        };
      }
    }

    if (!lastEvent) return;

    const diffMs = eventTime.getTime() - lastEvent.eventTime.getTime();

    // Check IN -> OUT restriction
    if (lastEvent.eventType === 'IN' && eventType === 'OUT') {
      if (diffMs < minInToOut * 60 * 1000) {
        throw new BadRequestException(`Minimum ${minInToOut} minutes required between check-in and check-out.`);
      }
    }

    // Check OUT -> IN restriction
    if (lastEvent.eventType === 'OUT' && eventType === 'IN') {
      if (diffMs < minOutToIn * 1000) {
        throw new BadRequestException(`Please wait ${minOutToIn} seconds before checking in again.`);
      }
    }
  }

  async createExternalEvent(
    dto: CreateEventDto,
    verification: ApiKeyVerificationResult,
  ): Promise<AttendanceEvent & { employeeName: string; shiftName: string }> {
    if (!verification.valid || !verification.company || !verification.apiKey) {
      throw new UnauthorizedException('Invalid API key verification');
    }

    const companyId = verification.company.id;
    const apiKeyName = verification.apiKey.name;

    const dtoWithEmployee = dto as CreateEventDto & { employeeId?: string };
    let employeeId: string | undefined = dtoWithEmployee.employeeId;
    let employeeName: string | undefined = verification.employee?.name;

    if (!employeeId) {
      const employee = await this.prisma.employee.findFirst({
        where: {
          companyId,
          employeeNo: dto.employeeNo,
        },
        select: { id: true, nameWithInitials: true, policyId: true },
      });

      if (!employee) {
        throw new NotFoundException(`Employee #${dto.employeeNo} not found in this company.`);
      }

      if (verification.restrictedToPolicyId && employee.policyId !== verification.restrictedToPolicyId) {
        throw new UnauthorizedException(
          `This API key is restricted to employees assigned to a specific policy. Employee #${dto.employeeNo} is not covered.`,
        );
      }

      employeeId = employee.id;
      employeeName = employee.nameWithInitials;
    } else {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, nameWithInitials: true, policyId: true },
      });

      if (!employee) {
        throw new NotFoundException(`Employee not found.`);
      }

      if (verification.restrictedToPolicyId && employee.policyId !== verification.restrictedToPolicyId) {
        throw new UnauthorizedException(`This API key is restricted to employees assigned to a specific policy.`);
      }

      employeeName = employee.nameWithInitials;
    }

    if (verification.type === 'EMPLOYEE' && verification.employee) {
      if (employeeId !== verification.employee.id) {
        throw new UnauthorizedException(`This API key is restricted to its owner only.`);
      }
    }

    const employeeData = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { company: true },
    });
    const timezone = employeeData?.company?.timezone || 'Asia/Colombo';
    const eventTime = this.timeService.parseDateTimeWithTimezone(dto.eventTime, timezone);
    let effectiveEventType = dto.eventType;
    let lastInEventTime: Date | undefined;

    if (!effectiveEventType) {
      const decision = await this.determineEventType(employeeId, eventTime, timezone);

      if (decision.autoCheckoutAt) {
        await this.prisma.attendanceEvent.create({
          data: {
            employeeId,
            companyId,
            eventTime: decision.autoCheckoutAt,
            eventType: 'OUT',
            source: 'MANUAL',
            remark: 'Auto checkout on shift end',
            status: 'ACTIVE',
            sessionId: decision.sessionId,
          },
        });
        effectiveEventType = 'IN';
      } else {
        effectiveEventType = decision.type;
        lastInEventTime = decision.lastEventTime;
      }
    }
    if (effectiveEventType === 'OUT' && !lastInEventTime) {
      const lastIn = await this.prisma.attendanceEvent.findFirst({
        where: { employeeId, eventType: 'IN', status: 'ACTIVE' },
        orderBy: { eventTime: 'desc' },
        select: { eventTime: true },
      });
      if (lastIn && eventTime.getTime() - lastIn.eventTime.getTime() < 24 * 60 * 60 * 1000) {
        lastInEventTime = lastIn.eventTime;
      }
    }

    // Apply time restriction validation
    const policy = (await this.policiesService.getEffectivePolicy(employeeId)) as unknown as PolicySettingsDto;
    await this.validateEventTiming(
      employeeId,
      eventTime,
      effectiveEventType as EventType,
      policy,
      lastInEventTime ? { eventTime: lastInEventTime, eventType: 'IN' } : undefined,
    );

    const shiftQueryTime = effectiveEventType === 'OUT' && lastInEventTime ? lastInEventTime : eventTime;

    const { shift } = await this.shiftSelectionService.getEffectiveShift(employeeId, shiftQueryTime, timezone);
    const shiftName = shift?.name || 'No Shift Assigned';

    const event = await this.prisma.attendanceEvent.create({
      data: {
        employeeId,
        companyId,
        eventTime,
        eventType: effectiveEventType,
        source: 'API_KEY',
        apiKeyName,
        device: dto.device,
        location: dto.location,
        latitude: dto.latitude,
        longitude: dto.longitude,
        remark: dto.remark,
        status: 'ACTIVE',
      },
    });

    void this.processingService.processEmployeeDate(employeeId, eventTime).catch((error) => {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Processing error: ${msg}`);
    });

    return {
      ...event,
      employeeName: employeeName || 'Unknown',
      shiftName,
    };
  }

  public async determineEventType(
    employeeId: string,
    eventTime: Date,
    timezone: string,
    lastEventContext?: {
      eventTime: Date;
      eventType: EventType;
      sessionId?: string | null;
    },
  ): Promise<{
    type: EventType;
    autoCheckoutAt?: Date;
    sessionId?: string | null;
    lastEventTime?: Date;
  }> {
    let lastEvent = lastEventContext;

    if (!lastEvent) {
      const dbLastEvent = await this.prisma.attendanceEvent.findFirst({
        where: { employeeId, status: 'ACTIVE' },
        orderBy: { eventTime: 'desc' },
        select: { eventTime: true, eventType: true, sessionId: true },
      });
      if (dbLastEvent) {
        lastEvent = {
          eventTime: new Date(dbLastEvent.eventTime),
          eventType: dbLastEvent.eventType,
          sessionId: dbLastEvent.sessionId,
        };
      }
    }

    if (!lastEvent || lastEvent.eventType === 'OUT') {
      return { type: 'IN' };
    }

    const lastEventTime = lastEvent.eventTime;
    const diffMs = eventTime.getTime() - lastEventTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    const { shift: lastShift } = await this.shiftSelectionService.getEffectiveShift(
      employeeId,
      lastEventTime,
      timezone,
    );
    let maxOutDate: Date | null = null;

    if (lastShift?.maxOutTime) {
      maxOutDate = this.timeService.parseTimeWithTimezone(lastShift.maxOutTime, lastEventTime, timezone);

      if (maxOutDate < lastEventTime) {
        maxOutDate.setDate(maxOutDate.getUTCDate() + 1);
      }
    }

    const isPast24h = diffHours >= 24;
    const isPastMaxOut = !!(lastShift && maxOutDate && eventTime > maxOutDate);

    if (lastShift && (isPast24h || isPastMaxOut)) {
      if (lastShift.autoClockOut && lastShift.endTime) {
        let autoCheckoutAt = this.timeService.parseTimeWithTimezone(lastShift.endTime, lastEventTime, timezone);

        if (autoCheckoutAt < lastEventTime) {
          autoCheckoutAt.setDate(autoCheckoutAt.getDate() + 1);
        }

        if (autoCheckoutAt >= eventTime) {
          autoCheckoutAt = new Date(eventTime.getTime() - 1000);
        }

        return {
          type: 'IN',
          autoCheckoutAt,
          sessionId: lastEvent.sessionId,
          lastEventTime: lastEvent.eventTime,
        };
      }

      return { type: 'IN' };
    }

    if (isPast24h) {
      return { type: 'IN' };
    }

    return { type: 'OUT', lastEventTime: lastEvent.eventTime };
  }

  async bulkCreateExternalEvents(dto: BulkCreateEventsDto, verification: ApiKeyVerificationResult) {
    if (!verification.valid || !verification.company || !verification.apiKey) {
      throw new UnauthorizedException('Invalid API key verification');
    }
    const companyId = verification.company.id;
    const apiKeyName = verification.apiKey.name;

    const sortedEvents = [...dto.events].sort(
      (a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime(),
    );

    const uniqueEmployeeNos = [...new Set(sortedEvents.map((e) => e.employeeNo).filter(Boolean) as number[])];

    const [employees, company] = await Promise.all([
      this.prisma.employee.findMany({
        where: { companyId, employeeNo: { in: uniqueEmployeeNos } },
        include: { company: true },
      }),
      this.prisma.company.findUnique({
        where: { id: companyId },
        include: { policies: { where: { isDefault: true } } },
      }),
    ]);

    const employeeIds = employees.map((e) => e.id);
    const policyMap = await this.policiesService.resolveBulkPolicies(employeeIds);

    const eventTimes = sortedEvents.map((e) => new Date(e.eventTime).getTime());
    const minDate = new Date(Math.min(...eventTimes));
    const maxDate = new Date(Math.max(...eventTimes));

    const calIds = new Set<string>();
    policyMap.forEach((p) => {
      if (p.calendarId) calIds.add(p.calendarId);
      if (p.attendance?.calendarId) calIds.add(p.attendance.calendarId);
      if (p.workingDays?.workingCalendar) calIds.add(p.workingDays.workingCalendar);
      if (p.workingDays?.payrollCalendar) calIds.add(p.workingDays.payrollCalendar);
    });

    const holidays = await this.prisma.holiday.findMany({
      where: {
        calendarId: { in: Array.from(calIds) },
        date: { gte: minDate, lte: maxDate },
      },
    });

    const empMap = new Map(employees.map((e) => [e.employeeNo, e]));
    const results: { employeeNo: number; status: string; error?: string }[] = [];
    const validEvents: Prisma.AttendanceEventUncheckedCreateInput[] = [];
    const timezone = company?.timezone || 'Asia/Colombo';

    const lastStateMap = new Map<string, { eventTime: Date; eventType: EventType; sessionId?: string | null }>();

    for (const eventDto of sortedEvents) {
      const employee = empMap.get(eventDto.employeeNo!);
      const employeeId = employee?.id;

      if (!employeeId) {
        results.push({ employeeNo: eventDto.employeeNo!, status: 'failed', error: 'Employee not found' });
        continue;
      }

      if (verification.restrictedToPolicyId && employee.policyId !== verification.restrictedToPolicyId) {
        results.push({ employeeNo: eventDto.employeeNo!, status: 'failed', error: 'Policy mismatch' });
        continue;
      }
      if (verification.type === 'EMPLOYEE' && verification.employee && employeeId !== verification.employee.id) {
        results.push({ employeeNo: eventDto.employeeNo!, status: 'failed', error: 'Restricted key' });
        continue;
      }

      const eventTime = this.timeService.parseDateTimeWithTimezone(eventDto.eventTime, timezone);
      let eventType = eventDto.eventType;
      let decision: { type: EventType; autoCheckoutAt?: Date; sessionId?: string | null } | undefined;

      if (!eventType) {
        const lastInBatch = lastStateMap.get(employeeId);
        const d = await this.determineEventType(employeeId, eventTime, timezone, lastInBatch);
        decision = d;

        if (d.autoCheckoutAt) {
          validEvents.push({
            employeeId,
            companyId,
            eventTime: d.autoCheckoutAt,
            eventType: 'OUT',
            source: 'MANUAL',
            remark: 'Auto checkout on shift end',
            status: 'ACTIVE',
            sessionId: d.sessionId,
          });
          lastStateMap.set(employeeId, {
            eventTime: d.autoCheckoutAt,
            eventType: 'OUT',
            sessionId: d.sessionId,
          });
          eventType = 'IN';
        } else {
          eventType = d.type;
        }
      }

      // Validate timing for batch
      const policy = policyMap.get(employeeId);
      if (policy) {
        const lastInBatch = lastStateMap.get(employeeId);
        await this.validateEventTiming(
          employeeId,
          eventTime,
          eventType as EventType,
          policy as unknown as PolicySettingsDto,
          lastInBatch ? { eventTime: lastInBatch.eventTime, eventType: lastInBatch.eventType as EventType } : undefined,
        );
      }

      lastStateMap.set(employeeId, {
        eventTime,
        eventType: eventType as EventType,
        sessionId: eventType === 'IN' ? null : decision?.sessionId || null,
      });

      validEvents.push({
        employeeId,
        companyId,
        eventTime,
        eventType: eventType as EventType,
        source: 'API_KEY',
        apiKeyName,
        device: eventDto.device,
        location: eventDto.location,
        latitude: eventDto.latitude,
        longitude: eventDto.longitude,
        remark: eventDto.remark,
        status: 'ACTIVE',
      });
    }

    if (validEvents.length > 0) {
      await this.prisma.attendanceEvent.createMany({ data: validEvents as any });
    }

    const processTasks = new Set<string>();
    validEvents.forEach((e) => {
      const dateStr = new Date(e.eventTime).toISOString().split('T')[0];
      processTasks.add(`${e.employeeId}:${dateStr}`);
    });

    const processingPromises = Array.from(processTasks).map(async (task) => {
      const [empId, dateStr] = task.split(':');
      const emp = employees.find((e) => e.id === empId);
      const policy = policyMap.get(empId);

      if (emp && policy) {
        const context: ProcessingContext = {
          employee: emp,
          policy: policy as unknown as PolicySettingsDto,
          holidays: holidays,
          timezone: emp.company?.timezone || timezone,
        };
        return this.processingService.processEmployeeDate(empId, new Date(dateStr), context).catch((error) => {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Batch processing error for ${empId}: ${msg}`);
        });
      }
    });

    await Promise.all(processingPromises);

    return {
      success: true,
      inserted: validEvents.length,
      failed: results.filter((r) => r.status === 'failed').length,
      results: [
        ...results,
        ...validEvents
          .filter((e) => e.source === 'API_KEY')
          .map((e) => ({
            employeeNo: employees.find((emp) => emp.id === e.employeeId)?.employeeNo,
            status: 'success',
          })),
      ],
    };
  }
}
