import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    SessionQueryDto,
    EventQueryDto,
} from '../dto/session.dto';
import { AttendanceSession } from '@prisma/client';

import { TimeService } from './time.service';

@Injectable()
export class AttendanceQueryService {
    private readonly logger = new Logger(AttendanceQueryService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly timeService: TimeService,
    ) { }

    /**
     * Get sessions with pagination
     */
    async getSessions(query: SessionQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 15;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (query.companyId) where.companyId = query.companyId;
        if (query.employeeId) where.employeeId = query.employeeId;

        if (query.startDate || query.endDate) {
            // Sessions store "Logical Date" as UTC 00:00:00.
            // Input strings from frontend (e.g., '2023-10-27') should be matched exactly.
            where.date = {};
            if (query.startDate) where.date.gte = new Date(query.startDate);
            if (query.endDate) where.date.lte = new Date(query.endDate);
        }

        if (query.isPending) {
            where.OR = [
                { inApprovalStatus: 'PENDING' },
                { outApprovalStatus: 'PENDING' }
            ];
        }

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

        const where: any = {};
        if (query.companyId) where.companyId = query.companyId;
        if (query.employeeId) where.employeeId = query.employeeId;

        if (query.startDate || query.endDate) {
            // Events store actual UTC time. We need to resolve company timezone to filter by "Local Day".
            const company = await this.prisma.company.findUnique({
                where: { id: query.companyId },
                select: { timezone: true }
            });
            const timezone = company?.timezone || 'UTC';

            where.eventTime = {};
            if (query.startDate) {
                where.eventTime.gte = this.timeService.getStartOfDayInTimezone(new Date(query.startDate), timezone);
            }
            if (query.endDate) {
                where.eventTime.lte = this.timeService.getEndOfDayInTimezone(new Date(query.endDate), timezone);
            }
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
}
