import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    SessionQueryDto,
    EventQueryDto,
} from '../dto/session.dto';
import { AttendanceSession } from '@prisma/client';

@Injectable()
export class AttendanceQueryService {
    private readonly logger = new Logger(AttendanceQueryService.name);

    constructor(private readonly prisma: PrismaService) { }

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
            where.date = {};
            if (query.startDate) where.date.gte = new Date(query.startDate);
            if (query.endDate) {
                const end = new Date(query.endDate);
                end.setUTCHours(23, 59, 59, 999);
                where.date.lte = end;
            }
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
            where.eventTime = {};
            if (query.startDate) where.eventTime.gte = new Date(query.startDate);
            if (query.endDate) {
                const end = new Date(query.endDate);
                end.setUTCHours(23, 59, 59, 999);
                where.eventTime.lte = end;
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
