import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HolidayQueryDto } from './dto/holiday-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CalendarsService {
    private readonly logger = new Logger(CalendarsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async findHolidays(query: HolidayQueryDto) {
        const {
            calendarId,
            search,
            startDate,
            endDate,
            isPublic,
            isMercantile,
            isBank,
            page = 1,
            limit = 10
        } = query;

        const skip = (page - 1) * limit;

        const where: Prisma.HolidayWhereInput = {};

        if (calendarId) {
            where.calendarId = calendarId;
        }

        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        if (isPublic !== undefined) where.isPublic = isPublic;
        if (isMercantile !== undefined) where.isMercantile = isMercantile;
        if (isBank !== undefined) where.isBank = isBank;

        const [total, items] = await Promise.all([
            this.prisma.holiday.count({ where }),
            this.prisma.holiday.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date: 'asc' },
                include: {
                    calendar: true
                }
            })
        ]);

        return {
            items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async findAllCalendars() {
        return this.prisma.calendar.findMany({
            where: { isGlobal: true },
            orderBy: { name: 'asc' }
        });
    }

    async findOneCalendar(id: string) {
        return this.prisma.calendar.findUnique({
            where: { id },
            include: { holidays: true }
        });
    }
}
