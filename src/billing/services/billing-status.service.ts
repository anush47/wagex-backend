import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface BillingStatus {
  suspensionLevel: 'NONE' | 'PORTAL' | 'ALL';
  unpaidCount: number;
  pendingCount: number;
  gracePeriodMonths: number;
  hasWarning: boolean;
  warningMessage: string | null;
}

@Injectable()
export class BillingStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(companyId: string): Promise<BillingStatus> {
    const billing = await this.prisma.companyBilling.findUnique({ where: { companyId } });

    if (!billing) {
      // Company uses the default config — no suspension possible, grace period from default
      const def = await this.prisma.companyBilling.findFirst({ where: { isDefault: true } });
      return {
        suspensionLevel: 'NONE',
        unpaidCount: 0,
        pendingCount: 0,
        gracePeriodMonths: def?.gracePeriodMonths ?? 2,
        hasWarning: false,
        warningMessage: null,
      };
    }

    const [unpaidCount, pendingCount] = await Promise.all([
      this.prisma.paymentInvoice.count({ where: { companyId, status: 'UNPAID' } }),
      this.prisma.paymentInvoice.count({ where: { companyId, status: 'PENDING' } }),
    ]);

    const suspensionLevel = billing.suspensionLevel as 'NONE' | 'PORTAL' | 'ALL';
    let hasWarning = false;
    let warningMessage: string | null = null;

    if (suspensionLevel === 'ALL') {
      hasWarning = true;
      warningMessage = 'Your account is fully suspended. Contact support to restore access.';
    } else if (suspensionLevel === 'PORTAL') {
      hasWarning = true;
      warningMessage = 'Your account is in read-only mode due to outstanding balance. Upload a payment slip to restore full access.';
    } else if (unpaidCount > 0) {
      hasWarning = true;
      warningMessage = `You have ${unpaidCount} unpaid invoice${unpaidCount > 1 ? 's' : ''}. Please upload a payment slip.`;
    }

    return { suspensionLevel, unpaidCount, pendingCount, gracePeriodMonths: billing.gracePeriodMonths, hasWarning, warningMessage };
  }
}
