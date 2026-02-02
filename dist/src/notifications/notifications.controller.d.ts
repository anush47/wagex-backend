import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    broadcast(body: BroadcastNotificationDto, req: any): Promise<void>;
    findAll(req: any, query: NotificationQueryDto): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            type: import("@prisma/client").$Enums.NotificationType;
            title: string;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            message: string;
            isRead: boolean;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    markAsRead(id: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        type: import("@prisma/client").$Enums.NotificationType;
        title: string;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        message: string;
        isRead: boolean;
    }>;
    markAllAsRead(req: any): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
