import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface AuditLogData {
  action: string;
  entity: string;
  resourceId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  companyId?: string;
  details?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  logAction(data: AuditLogData) {
    // Fire and forget (don't await) to not block main thread
    this.prisma.auditLog
      .create({
        data: {
          action: data.action,
          entity: data.entity,
          resourceId: data.resourceId,
          userId: data.userId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          companyId: data.companyId,
          details: data.details || Prisma.JsonNull,
        },
      })
      .catch((err) => console.error('Audit Log Failed:', err));
  }
}
