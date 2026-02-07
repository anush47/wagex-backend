import { PrismaService } from '../prisma/prisma.service';
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    logAction(data: {
        action: string;
        entity: string;
        resourceId?: string;
        userId?: string;
        ipAddress?: string;
        details?: any;
    }): Promise<void>;
}
