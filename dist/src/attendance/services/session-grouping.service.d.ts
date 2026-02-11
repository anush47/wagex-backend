import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceEvent } from '@prisma/client';
export interface SessionGroup {
    events: AttendanceEvent[];
    firstIn: Date | null;
    lastOut: Date | null;
    additionalInOutPairs: Array<{
        in: Date;
        out: Date;
    }>;
    sessionDate: Date;
}
export declare class SessionGroupingService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    groupEventsIntoSessions(employeeId: string, events: AttendanceEvent[], referenceDate: Date): Promise<SessionGroup[]>;
    private groupEventsByTimeProximity;
    private processEventGroup;
    getEventsForSessionGrouping(employeeId: string, referenceDate: Date): Promise<AttendanceEvent[]>;
}
