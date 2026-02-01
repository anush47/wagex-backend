import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Role, User } from '@prisma/client';
import { NotificationQueryDto } from './dto/notification-query.dto';
export declare class NotificationsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    send(userId: string, title: string, message: string, type?: NotificationType, metadata?: any): Promise<{
        id: string;
        title: string;
        message: string;
        type: import("@prisma/client").$Enums.NotificationType;
        isRead: boolean;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    broadcast(sender: User, targetRole: Role | null, title: string, message: string, specificUserIds?: string[], type?: NotificationType, metadata?: any): Promise<void>;
    getUserNotifications(userId: string, query: NotificationQueryDto): Promise<{
        data: {
            id: string;
            title: string;
            message: string;
            type: import("@prisma/client").$Enums.NotificationType;
            isRead: boolean;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    markAsRead(id: string, userId: string): Promise<{
        id: string;
        title: string;
        message: string;
        type: import("@prisma/client").$Enums.NotificationType;
        isRead: boolean;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    markAllAsRead(userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
