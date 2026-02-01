import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Role, User } from '@prisma/client';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async send(userId: string, title: string, message: string, type: NotificationType = NotificationType.INFO, metadata: any = {}) {
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

    async broadcast(sender: User, targetRole: Role | null, title: string, message: string, specificUserIds?: string[], type: NotificationType = NotificationType.INFO, metadata: any = {}) {
        let recipientIds: string[] = [];

        if (sender.role === Role.ADMIN) {
            if (specificUserIds && specificUserIds.length > 0) {
                // Admin -> Specific Users
                // Optionally filter by role if provided
                const whereClause: any = { id: { in: specificUserIds } };
                if (targetRole) {
                    whereClause.role = targetRole;
                }
                const users = await this.prisma.user.findMany({ where: whereClause, select: { id: true } });
                recipientIds = users.map(u => u.id);
            } else if (targetRole) {
                // Admin -> Specific Role
                const users = await this.prisma.user.findMany({
                    where: { role: targetRole },
                    select: { id: true }
                });
                recipientIds = users.map(u => u.id);
            } else {
                // Admin -> All Users
                const users = await this.prisma.user.findMany({
                    select: { id: true }
                });
                recipientIds = users.map(u => u.id);
            }
        } else if (sender.role === Role.EMPLOYER) {
            // Employer -> Their Employees

            // 1. Find companies owned by Employer
            const employerCompanies = await this.prisma.userCompany.findMany({
                where: { userId: sender.id, role: Role.EMPLOYER },
                select: { companyId: true }
            });
            const companyIds = employerCompanies.map(c => c.companyId);

            // 2. Find employees in those companies
            const employees = await this.prisma.userCompany.findMany({
                where: {
                    companyId: { in: companyIds },
                    role: Role.EMPLOYEE // Only blast employees
                },
                select: { userId: true }
            });
            const validEmployeeIds = employees.map(e => e.userId);

            if (specificUserIds && specificUserIds.length > 0) {
                // Employer -> Specific Employees (Intersection)
                recipientIds = specificUserIds.filter(id => validEmployeeIds.includes(id));
            } else {
                // Employer -> All Employees
                recipientIds = [...new Set(validEmployeeIds)];
            }
        }

        // Batch Create
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

    async getUserNotifications(userId: string, query: NotificationQueryDto) {
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

    async markAsRead(id: string, userId: string) {
        // userId check ensures they own it
        return this.prisma.notification.update({
            where: { id, userId },
            data: { isRead: true }
        });
    }

    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
    }
}
