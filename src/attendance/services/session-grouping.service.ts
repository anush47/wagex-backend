import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimeService } from './time.service';
import { AttendanceEvent, EventType } from '@prisma/client';
import { ShiftSelectionService } from './shift-selection.service';

export interface SessionGroup {
  events: AttendanceEvent[];
  firstIn: Date | null;
  lastOut: Date | null;
  additionalInOutPairs: Array<{ in: Date; out: Date }>;
  sessionDate: Date;
}

@Injectable()
export class SessionGroupingService {
  private readonly logger = new Logger(SessionGroupingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly timeService: TimeService,
    private readonly shiftSelectionService: ShiftSelectionService,
  ) { }

  /**
   * Groups attendance events into logical sessions based on time proximity
   * Events within 24 hours of each other are grouped together
   */
  async groupEventsIntoSessions(
    employeeId: string,
    events: AttendanceEvent[],
    referenceDate: Date,
    timezone: string,
  ): Promise<SessionGroup[]> {
    // Sort events chronologically
    const sortedEvents = [...events].sort(
      (a, b) => a.eventTime.getTime() - b.eventTime.getTime()
    );

    // Group events into sessions based on 24-hour gaps
    const sessionGroups = this.groupEventsByTimeProximity(sortedEvents);

    // Process each group into a session structure
    const sessionGroupsProcessed: SessionGroup[] = await Promise.all(
      sessionGroups.map(group => this.processEventGroup(group, referenceDate, timezone))
    );

    return sessionGroupsProcessed;
  }

  /**
   * Groups events based on time proximity (12-hour window)
   */
  private groupEventsByTimeProximity(events: AttendanceEvent[]): AttendanceEvent[][] {
    const groups: AttendanceEvent[][] = [];
    if (events.length === 0) return groups;

    let currentGroup: AttendanceEvent[] = [events[0]];

    for (let i = 1; i < events.length; i++) {
      const prevEvent = events[i - 1];
      const currentEvent = events[i];

      const gapMs = currentEvent.eventTime.getTime() - prevEvent.eventTime.getTime();
      const gapHours = gapMs / (1000 * 60 * 60);

      let shouldSplit = false;

      // Rule 1: Normal gap between any two events
      if (gapHours > 24) {
        shouldSplit = true;
      }
      // Rule 2: Gap between an OUT and the next IN (End of shift)
      else if (prevEvent.eventType === 'OUT' && currentEvent.eventType === 'IN' && gapHours > 10) {
        shouldSplit = true;
      }
      // Rule 3: Gap between two similar events (Duplicate logs or long forgotten clock-out)
      else if (prevEvent.eventType === currentEvent.eventType && gapHours > 12) {
        shouldSplit = true;
      }
      // Rule 4: Gap between IN and the next OUT (Shift duration)
      // We allow up to 24h for a single shift duration. 
      // If it's longer than 24h, it's probably an error or separate days.
      else if (prevEvent.eventType === 'IN' && currentEvent.eventType === 'OUT' && gapHours > 28) {
        shouldSplit = true;
      }

      if (shouldSplit) {
        groups.push(currentGroup);
        currentGroup = [currentEvent];
      } else {
        currentGroup.push(currentEvent);
      }
    }

    groups.push(currentGroup);
    return groups;
  }

  /**
   * Process a group of events into session data structure
   */
  private async processEventGroup(events: AttendanceEvent[], referenceDate: Date, timezone: string): Promise<SessionGroup> {
    const sortedEvents = [...events].sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());

    const inEvents = sortedEvents.filter(e => e.eventType === 'IN');
    const outEvents = sortedEvents.filter(e => e.eventType === 'OUT');

    const firstIn = events.find((e) => e.eventType === 'IN')?.eventTime;
    const lastOut = events
      .slice()
      .reverse()
      .find((e) => e.eventType === 'OUT')?.eventTime;

    // Simplified break pairing: any gap between consecutive events within the primary bounds
    const additionalInOutPairs: Array<{ in: Date; out: Date }> = [];
    if (firstIn && lastOut) {
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const current = sortedEvents[i];
        const next = sortedEvents[i + 1];
        // If we have OUT followed by IN between our first and last markers, it's a break
        if (current.eventType === 'OUT' && next.eventType === 'IN' &&
          current.eventTime >= firstIn && next.eventTime <= lastOut) {
          additionalInOutPairs.push({ in: current.eventTime, out: next.eventTime });
        }
      }
    }

    // Use TimeService to get the logical date for this session in the target timezone
    let sessionDate = this.timeService.getLogicalDate(firstIn || referenceDate, timezone);

    // Apply Shift Date Offset (e.g. for night shifts starting yesterday)
    if (firstIn) {
      const { dateOffset } = await this.shiftSelectionService.getEffectiveShift(
        events[0].employeeId,
        firstIn,
        timezone
      );

      if (dateOffset !== 0) {
        sessionDate.setUTCDate(sessionDate.getUTCDate() + dateOffset);
        this.logger.log(`[GROUPING] Applied dateOffset ${dateOffset} to sessionDate. New date: ${sessionDate.toISOString()}`);
      }
    }

    this.logger.log(`[GROUPING] Processed group: start = ${firstIn?.toISOString()}, end = ${lastOut?.toISOString()}, pairs = ${additionalInOutPairs.length} `);

    return { events: sortedEvents, firstIn: firstIn || null, lastOut: lastOut || null, additionalInOutPairs, sessionDate };
  }

  /**
   * Get all events for an employee within a time window around a reference date
   */
  async getEventsForSessionGrouping(
    employeeId: string,
    referenceDate: Date,
    timezone: string,
  ): Promise<AttendanceEvent[]> {
    // Get events from start of yesterday to end of tomorrow in the company timezone
    const startDate = this.timeService.getStartOfDayInTimezone(referenceDate, timezone);
    startDate.setUTCDate(startDate.getUTCDate() - 1);

    const endDate = this.timeService.getEndOfDayInTimezone(referenceDate, timezone);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    return this.prisma.attendanceEvent.findMany({
      where: {
        employeeId,
        eventTime: {
          gte: startDate,
          lte: endDate,
        },
        status: 'ACTIVE',
      },
      orderBy: {
        eventTime: 'asc',
      },
    });
  }
}