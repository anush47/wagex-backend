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
var AttendanceQueryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceQueryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AttendanceQueryService = AttendanceQueryService_1 = class AttendanceQueryService {
    prisma;
    logger = new common_1.Logger(AttendanceQueryService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSessions(query) {
        const page = query.page || 1;
        const limit = query.limit || 15;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.companyId)
            where.companyId = query.companyId;
        if (query.employeeId)
            where.employeeId = query.employeeId;
        if (query.startDate || query.endDate) {
            where.date = {};
            if (query.startDate)
                where.date.gte = new Date(query.startDate);
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
    async getSession(id) {
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
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        return session;
    }
    async getSessionEvents(sessionId) {
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
    async getEvents(query) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.companyId)
            where.companyId = query.companyId;
        if (query.employeeId)
            where.employeeId = query.employeeId;
        if (query.startDate || query.endDate) {
            where.eventTime = {};
            if (query.startDate)
                where.eventTime.gte = new Date(query.startDate);
            if (query.endDate) {
                const end = new Date(query.endDate);
                end.setUTCHours(23, 59, 59, 999);
                where.eventTime.lte = end;
            }
        }
        if (query.status)
            where.status = query.status;
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
};
exports.AttendanceQueryService = AttendanceQueryService;
exports.AttendanceQueryService = AttendanceQueryService = AttendanceQueryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttendanceQueryService);
//# sourceMappingURL=attendance-query.service.js.map