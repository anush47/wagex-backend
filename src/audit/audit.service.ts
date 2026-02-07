import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
    constructor(private readonly prisma: PrismaService) { }

    async logAction(data: {
        action: string;
        entity: string;
        resourceId?: string;
        userId?: string;
        ipAddress?: string;
        details?: any;
    }) {
        // Fire and forget (don't await) to not block main thread
        this.prisma.auditLog.create({
            data: {
                action: data.action,
                entity: data.entity,
                resourceId: data.resourceId,
                userId: data.userId,
                ipAddress: data.ipAddress,
                details: data.details,
            },
        }).catch(err => console.error('Audit Log Failed:', err));
    }
}
