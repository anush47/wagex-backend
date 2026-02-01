import { Role } from '@prisma/client';
export declare class BroadcastNotificationDto {
    targetRole?: Role;
    title: string;
    message: string;
    userIds?: string[];
    type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    metadata?: any;
}
