import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceQueryService } from './attendance-query.service';
import { AttendanceExternalService } from './attendance-external.service';
import { AttendanceProcessingService } from './attendance-processing.service';
import { PoliciesService } from '../../policies/policies.service';
import { TimeService } from './time.service';
import { ShiftSelectionService } from './shift-selection.service';
import { SessionQueryDto } from '../dto/session.dto';
import { Role } from '@prisma/client';
import { PolicySettingsDto, GeofencingEnforcement } from '../../policies/dto/policy-settings.dto';

@Injectable()
export class AttendancePortalService {
  private readonly logger = new Logger(AttendancePortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queryService: AttendanceQueryService,
    private readonly externalService: AttendanceExternalService,
    private readonly processingService: AttendanceProcessingService,
    private readonly policiesService: PoliciesService,
    private readonly timeService: TimeService,
    private readonly shiftSelectionService: ShiftSelectionService,
  ) {}

  /**
   * Get attendance sessions for the current employee (Portal view)
   */
  async getEmployeeSessions(userId: string, companyId: string, query: SessionQueryDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    const employeeId = employee.id;

    // Force filters for the current employee
    const forcedQuery: SessionQueryDto = {
      ...query,
      employeeId,
      companyId,
    };
    return this.queryService.getSessions(forcedQuery);
  }

  /**
   * Get current attendance status for the portal dashboard
   */
  async getAttendanceStatus(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      include: { company: true },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    const employeeId = employee.id;
    const policy = (await this.policiesService.getEffectivePolicy(employeeId)) as unknown as PolicySettingsDto;
    const timezone = employee.company?.timezone || 'Asia/Colombo';
    const now = new Date();

    // Find last event to determine current status
    const lastEvent = await this.prisma.attendanceEvent.findFirst({
      where: { employeeId, status: 'ACTIVE' },
      orderBy: { eventTime: 'desc' },
      select: { eventTime: true, eventType: true, sessionId: true },
    });

    const nextEventDecision = await this.externalService.determineEventType(employeeId, now, timezone, lastEvent ? {
        eventTime: lastEvent.eventTime,
        eventType: lastEvent.eventType as any,
        sessionId: lastEvent.sessionId
    } : undefined);

    const { shift } = await this.shiftSelectionService.getEffectiveShift(employeeId, now, timezone);

    return {
      lastEvent: lastEvent ? {
        time: lastEvent.eventTime,
        type: lastEvent.eventType,
      } : null,
      nextExpectedEvent: nextEventDecision.type,
      activeShift: shift ? {
        id: shift.id,
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
      } : null,
      config: {
        allowSelfCheckIn: policy.attendance?.allowSelfCheckIn ?? false,
        requireLocation: policy.attendance?.requireLocation ?? false,
        geofencingEnabled: policy.attendance?.geofencing?.enabled ?? false,
        zones: policy.attendance?.geofencing?.zones || [],
      },
      serverTime: now,
    };
  }

  /**
   * Mark attendance from the portal
   */
  async markAttendance(
    userId: string,
    companyId: string,
    coords?: { latitude: number; longitude: number },
    remark?: string,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      include: { company: true },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    const employeeId = employee.id;
    const policy = (await this.policiesService.getEffectivePolicy(employeeId)) as unknown as PolicySettingsDto;
    
    // 1. Policy Check: Self-Checkin allowed?
    if (!policy.attendance?.allowSelfCheckIn) {
      throw new ForbiddenException('Self check-in is not allowed for your policy.');
    }

    // 2. Policy Check: Location required?
    if (policy.attendance?.requireLocation && (!coords || !coords.latitude || !coords.longitude)) {
      throw new BadRequestException('Precise location is required to mark attendance.');
    }

    // 3. Geofencing Check
    if (policy.attendance?.geofencing?.enabled && coords) {
      const config = policy.attendance.geofencing;
      let isInsideAnyZone = false;
      let nearestZoneName = '';
      let minDistance = Infinity;

      for (const zone of config.zones) {
        const dist = this.calculateDistance(coords.latitude, coords.longitude, zone.latitude, zone.longitude);
        if (dist <= zone.radius) {
          isInsideAnyZone = true;
          break;
        }
        if (dist < minDistance) {
            minDistance = dist;
            nearestZoneName = zone.name;
        }
      }

      if (!isInsideAnyZone && config.enforcement === GeofencingEnforcement.STRICT) {
        throw new ForbiddenException(`You are out of the allowed attendance zones. Nearest: ${nearestZoneName}`);
      }
      
      this.logger.log(`Employee ${employeeId} distance from nearest zone (${nearestZoneName}): ${minDistance}m`);
    }

    const timezone = employee.company?.timezone || 'Asia/Colombo';
    const now = this.timeService.parseDateTimeWithTimezone('', timezone);

    // Determine event type (In/Out) with auto-checkout support
    const decision = await this.externalService.determineEventType(employeeId, now, timezone);

    // Handle auto-checkout if needed
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
    }

    const eventType = decision.autoCheckoutAt ? 'IN' : decision.type;

    // Create the event
    const event = await this.prisma.attendanceEvent.create({
      data: {
        employeeId,
        companyId,
        eventTime: now,
        eventType,
        source: 'PORTAL',
        device: 'Web Portal',
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        remark,
        status: 'ACTIVE',
      },
    });

    // Trigger processing
    void this.processingService.processEmployeeDate(employeeId, now).catch((err) => {
        this.logger.error(`Failed to process portal event: ${err.message}`, err.stack);
    });

    return {
      success: true,
      event: {
        id: event.id,
        eventType: event.eventType,
        eventTime: event.eventTime,
      },
    };
  }

  /**
   * Helper: Calculate distance between two points (Haversine Formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
