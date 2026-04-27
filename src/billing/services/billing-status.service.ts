import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { addDays, subDays, startOfMonth, addMonths, format, endOfMonth } from 'date-fns';

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

  /**
   * Throws ForbiddenException if the company has no purchased invoice
   * (UNPAID / PENDING / PAID) for any billing month within ±15 days of periodEndDate.
   */
  async assertBillingForPeriodEnd(companyId: string, periodEndDate: Date): Promise<void> {
    const expandedStart = subDays(periodEndDate, 15);
    const expandedEnd = addDays(periodEndDate, 15);

    const months: string[] = [];
    let cursor = startOfMonth(expandedStart);
    while (cursor <= expandedEnd) {
      months.push(format(cursor, 'yyyy-MM'));
      cursor = addMonths(cursor, 1);
    }

    const count = await this.prisma.paymentInvoice.count({
      where: {
        companyId,
        billingPeriod: { in: months },
        status: { in: ['UNPAID', 'PENDING', 'PAID', 'FREE', 'SKIPPED'] },
      },
    });

    if (count === 0) {
      throw new ForbiddenException(
        `No billing invoice purchased for period ending ${format(periodEndDate, 'yyyy-MM-dd')}. ` +
        `Please purchase the invoice for month(s): ${months.join(', ')}.`,
      );
    }
  }

  /** Convenience helper: build periodEndDate from month+year (last day of that month). */
  periodEndFromMonthYear(month: number, year: number): Date {
    return endOfMonth(new Date(year, month - 1, 1));
  }

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

    const statusCounts = await this.prisma.paymentInvoice.groupBy({
      by: ['status'],
      where: { companyId, status: { in: ['UNPAID', 'PENDING'] } },
      _count: true,
    });
    const unpaidCount = statusCounts.find((s) => s.status === 'UNPAID')?._count ?? 0;
    const pendingCount = statusCounts.find((s) => s.status === 'PENDING')?._count ?? 0;

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
