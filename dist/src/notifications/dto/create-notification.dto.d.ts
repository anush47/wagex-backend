import { NotificationType } from '@prisma/client';
export declare class CreateNotificationDto {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    metadata?: any;
}
