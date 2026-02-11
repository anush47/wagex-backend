import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceEvent } from '@prisma/client';

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

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Groups attendance events into logical sessions based on time proximity
   * Events within 24 hours of each other are grouped together
   */
  async groupEventsIntoSessions(
    employeeId: string,
    events: AttendanceEvent[],
    referenceDate: Date
  ): Promise<SessionGroup[]> {
    // Sort events chronologically
    const sortedEvents = [...events].sort(
      (a, b) => a.eventTime.getTime() - b.eventTime.getTime()
    );

    // Group events into sessions based on 24-hour gaps
    const sessionGroups = this.groupEventsByTimeProximity(sortedEvents);

    // Process each group into a session structure
    const sessionGroupsProcessed: SessionGroup[] = sessionGroups.map(group => {
      const sessionData = this.processEventGroup(group, referenceDate);
      return sessionData;
    });

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
  private processEventGroup(events: AttendanceEvent[], referenceDate: Date): SessionGroup {
    const sortedEvents = [...events].sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());

    const inEvents = sortedEvents.filter(e => e.eventType === 'IN');
    const outEvents = sortedEvents.filter(e => e.eventType === 'OUT');

    const firstIn = inEvents.length > 0 ? inEvents[0].eventTime : null;
    const lastOut = outEvents.length > 0 ? outEvents[outEvents.length - 1].eventTime : null;

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

    const sessionDate = firstIn
      ? new Date(Date.UTC(firstIn.getUTCFullYear(), firstIn.getUTCMonth(), firstIn.getUTCDate()))
      : new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));

    this.logger.log(`[GROUPING] Processed group: start=${firstIn?.toISOString()}, end=${lastOut?.toISOString()}, pairs=${additionalInOutPairs.length}`);

    return { events: sortedEvents, firstIn, lastOut, additionalInOutPairs, sessionDate };
  }

  /**
   * Get all events for an employee within a time window around a reference date
   */
  async getEventsForSessionGrouping(
    employeeId: string,
    referenceDate: Date
  ): Promise<AttendanceEvent[]> {
    // Get events from start of yesterday to end of tomorrow
    const startDate = new Date(referenceDate);
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - 1);

    const endDate = new Date(referenceDate);
    endDate.setUTCHours(23, 59, 59, 999);
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