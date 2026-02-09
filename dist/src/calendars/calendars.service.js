"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CalendarsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CalendarsService = CalendarsService_1 = class CalendarsService {
    prisma;
    logger = new common_1.Logger(CalendarsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findHolidays(query) {
        const { calendarId, search, startDate, endDate, isPublic, isMercantile, isBank, page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (calendarId) {
            where.calendarId = calendarId;
        }
        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        if (isPublic !== undefined)
            where.isPublic = isPublic;
        if (isMercantile !== undefined)
            where.isMercantile = isMercantile;
        if (isBank !== undefined)
            where.isBank = isBank;
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
    async findOneCalendar(id) {
        return this.prisma.calendar.findUnique({
            where: { id },
            include: { holidays: true }
        });
    }
};
exports.CalendarsService = CalendarsService;
exports.CalendarsService = CalendarsService = CalendarsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CalendarsService);
//# sourceMappingURL=calendars.service.js.map