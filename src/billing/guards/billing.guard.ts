import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@Injectable()
export class BillingGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // Only enforce for EMPLOYER role
    if (!user || user.role !== Role.EMPLOYER) return true;

    // Billing routes are always writable
    if (request.url.includes('/billing')) return true;

    const query = (request.query || {}) as Record<string, string>;
    const params = (request.params || {}) as Record<string, string>;
    const body = (request.body || {}) as Record<string, any>;
    const companyId = query.companyId || params.companyId || body?.companyId || params.id;

    if (!companyId) return true;

    const billing = await this.prisma.companyBilling.findUnique({
      where: { companyId },
      select: { suspensionLevel: true },
    });
    if (!billing || billing.suspensionLevel === 'NONE') return true;

    const method = request.method.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      throw new HttpException(
        'Account is in read-only mode due to outstanding balance. Pay your invoices to restore access.',
        423,
      );
    }

    return true;
  }
}
