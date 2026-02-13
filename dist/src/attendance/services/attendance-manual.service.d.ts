import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceProcessingService } from './attendance-processing.service';
import { AttendanceCalculationService } from './attendance-calculation.service';
import { LeaveIntegrationService } from './leave-integration.service';
import { PoliciesService } from '../../policies/policies.service';
import { CreateEventDto } from '../dto/event.dto';
import { UpdateSessionDto, CreateSessionDto } from '../dto/session.dto';
import { EventSource, AttendanceEvent, AttendanceSession, EventType } from '@prisma/client';
export declare class AttendanceManualService {
    private readonly prisma;
    private readonly processingService;
    private readonly calculationService;
    private readonly policiesService;
    private readonly leaveService;
    private readonly logger;
    constructor(prisma: PrismaService, processingService: AttendanceProcessingService, calculationService: AttendanceCalculationService, policiesService: PoliciesService, leaveService: LeaveIntegrationService);
    createManualEvent(dto: CreateEventDto, source?: EventSource): Promise<AttendanceEvent>;
    createManualSession(dto: CreateSessionDto): Promise<AttendanceSession>;
    updateSession(id: string, dto: UpdateSessionDto): Promise<AttendanceSession>;
    deleteSession(id: string): Promise<{
        message: string;
    }>;
    linkEventToSession(eventId: string, sessionId: string): Promise<void>;
    unlinkEventFromSession(eventId: string): Promise<void>;
    updateEventType(eventId: string, eventType: EventType): Promise<void>;
}
