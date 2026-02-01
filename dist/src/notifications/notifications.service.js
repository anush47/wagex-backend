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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    prisma;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async send(userId, title, message, type = client_1.NotificationType.INFO, metadata = {}) {
        return this.prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                metadata
            }
        });
    }
    async broadcast(sender, targetRole, title, message, specificUserIds, type = client_1.NotificationType.INFO, metadata = {}) {
        let recipientIds = [];
        if (sender.role === client_1.Role.ADMIN) {
            if (specificUserIds && specificUserIds.length > 0) {
                const whereClause = { id: { in: specificUserIds } };
                if (targetRole) {
                    whereClause.role = targetRole;
                }
                const users = await this.prisma.user.findMany({ where: whereClause, select: { id: true } });
                recipientIds = users.map(u => u.id);
            }
            else if (targetRole) {
                const users = await this.prisma.user.findMany({
                    where: { role: targetRole },
                    select: { id: true }
                });
                recipientIds = users.map(u => u.id);
            }
            else {
                const users = await this.prisma.user.findMany({
                    select: { id: true }
                });
                recipientIds = users.map(u => u.id);
            }
        }
        else if (sender.role === client_1.Role.EMPLOYER) {
            const employerCompanies = await this.prisma.userCompany.findMany({
                where: { userId: sender.id, role: client_1.Role.EMPLOYER },
                select: { companyId: true }
            });
            const companyIds = employerCompanies.map(c => c.companyId);
            const employees = await this.prisma.userCompany.findMany({
                where: {
                    companyId: { in: companyIds },
                    role: client_1.Role.EMPLOYEE
                },
                select: { userId: true }
            });
            const validEmployeeIds = employees.map(e => e.userId);
            if (specificUserIds && specificUserIds.length > 0) {
                recipientIds = specificUserIds.filter(id => validEmployeeIds.includes(id));
            }
            else {
                recipientIds = [...new Set(validEmployeeIds)];
            }
        }
        if (recipientIds.length > 0) {
            await this.prisma.notification.createMany({
                data: recipientIds.map(userId => ({
                    userId,
                    title,
                    message,
                    type,
                    metadata
                }))
            });
            this.logger.log(`Broadcast sent by ${sender.email} to ${recipientIds.length} users.`);
        }
    }
    async getUserNotifications(userId, query) {
        const { page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: skip
            }),
            this.prisma.notification.count({ where: { userId } })
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async markAsRead(id, userId) {
        return this.prisma.notification.update({
            where: { id, userId },
            data: { isRead: true }
        });
    }
    async markAllAsRead(userId) {
        return this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map