import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingConfigService } from './billing-config.service';

interface EmployeeTier { upTo: number; priceLkr: number; }
interface ServiceAddon { name: string; priceLkr: number; active: boolean; }
interface MonthDiscount { months: number; discountPct: number; }

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingConfigService: BillingConfigService,
  ) {}

  calculatePrice(billing: any, monthCount: number) {
    const tiers = (billing.employeeTiers as EmployeeTier[]) || [];
    const services = (billing.services as ServiceAddon[]) || [];
    const discounts = (billing.multiMonthDiscounts as MonthDiscount[]) || [];
    const employeeCount = billing.employeeCount as number;

    let basePriceLkr = Number(billing.basePriceLkr);
    if (tiers.length > 0) {
      const tier = tiers.find((t) => employeeCount <= t.upTo);
      basePriceLkr = tier ? tier.priceLkr : tiers[tiers.length - 1].priceLkr;
    }

    const addonPriceLkr = services.filter((s) => s.active).reduce((sum, s) => sum + s.priceLkr, 0);
    const subtotalPerMonth = basePriceLkr + addonPriceLkr;
    const subtotal = subtotalPerMonth * monthCount;

    const discount = discounts
      .filter((d) => monthCount >= d.months)
      .sort((a, b) => b.months - a.months)[0];
    const discountPct = discount?.discountPct ?? 0;
    const discountLkr = Math.round(subtotal * (discountPct / 100));

    return { basePriceLkr, addonPriceLkr, discountLkr, totalLkr: subtotal - discountLkr };
  }

  async createInvoices(companyId: string, billingPeriods: string[], createdByUserId: string) {
    if (billingPeriods.length === 0) throw new BadRequestException('No billing periods provided');
    if (billingPeriods.length > 12) throw new BadRequestException('Maximum 12 months per purchase');

    // Auto-create a custom config (copy from default) if the company has none,
    // so invoices always have a real companyBillingId FK.
    await this.billingConfigService.createCustomForCompany(companyId);
    const billing = await this.billingConfigService.getForCompany(companyId);

    const existing = await this.prisma.paymentInvoice.findMany({
      where: { companyId, billingPeriod: { in: billingPeriods } },
      select: { billingPeriod: true },
    });
    const existingPeriods = existing.map((e) => e.billingPeriod);
    const newPeriods = billingPeriods.filter((p) => !existingPeriods.includes(p));

    if (newPeriods.length === 0) throw new BadRequestException('All selected periods already have invoices');

    const batchPrice = this.calculatePrice(billing, newPeriods.length);
    // Distribute discount equally; last period absorbs rounding remainder
    const discountPerPeriod = Math.floor(batchPrice.discountLkr / newPeriods.length);
    const totalPerPeriod = Math.floor(batchPrice.totalLkr / newPeriods.length);
    const lastDiscount = batchPrice.discountLkr - discountPerPeriod * (newPeriods.length - 1);
    const lastTotal = batchPrice.totalLkr - totalPerPeriod * (newPeriods.length - 1);

    await this.prisma.paymentInvoice.createMany({
      data: newPeriods.map((period, idx) => {
        const isLast = idx === newPeriods.length - 1;
        return {
          companyBillingId: billing.id,
          companyId,
          billingPeriod: period,
          employeeCountSnap: billing.employeeCount,
          basePriceLkr: batchPrice.basePriceLkr,
          addonPriceLkr: batchPrice.addonPriceLkr,
          discountLkr: isLast ? lastDiscount : discountPerPeriod,
          totalLkr: isLast ? lastTotal : totalPerPeriod,
          status: 'UNPAID',
        };
      }),
    });

    return this.prisma.paymentInvoice.findMany({
      where: { companyId, billingPeriod: { in: newPeriods } },
      orderBy: { billingPeriod: 'asc' },
    });
  }

  async previewPrice(companyId: string, billingPeriods: string[]) {
    const billing = await this.billingConfigService.getForCompany(companyId);
    return {
      ...this.calculatePrice(billing, billingPeriods.length),
      employeeCount: billing.employeeCount,
      periods: billingPeriods,
    };
  }

  async uploadSlip(companyId: string, invoiceIds: string[], slipUrl: string, uploadedByUserId: string) {
    const pendingCount = await this.prisma.paymentInvoice.count({
      where: { companyId, status: 'PENDING' },
    });
    if (pendingCount > 0) {
      throw new BadRequestException('A payment is already pending approval. Wait for admin to process it first.');
    }

    const invoices = await this.prisma.paymentInvoice.findMany({
      where: { id: { in: invoiceIds }, companyId, status: 'UNPAID' },
    });
    if (invoices.length === 0) throw new BadRequestException('No valid UNPAID invoices found');
    if (invoices.length !== invoiceIds.length) {
      throw new BadRequestException('Some invoices are not UNPAID or do not belong to this company');
    }

    await this.prisma.paymentInvoice.updateMany({
      where: { id: { in: invoiceIds } },
      data: { status: 'PENDING', slipUrl, uploadedByUserId },
    });

    return { updated: invoices.length };
  }

  async reviewInvoices(invoiceIds: string[], approved: boolean, reviewedByUserId: string, rejectionReason?: string) {
    if (!approved && !rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting');
    }

    const invoices = await this.prisma.paymentInvoice.findMany({
      where: { id: { in: invoiceIds }, status: 'PENDING' },
    });
    if (invoices.length === 0) throw new BadRequestException('No PENDING invoices found');

    const pendingIds = invoices.map((i) => i.id);
    const result = await this.prisma.paymentInvoice.updateMany({
      where: { id: { in: pendingIds }, status: 'PENDING' },
      data: {
        status: approved ? 'PAID' : 'UNPAID',
        reviewedByUserId,
        rejectionReason: approved ? null : rejectionReason,
        paidAt: approved ? new Date() : null,
        ...(approved ? {} : { slipUrl: null }),
      },
    });

    return { updated: result.count, approved };
  }

  async setSpecialStatus(invoiceId: string, status: 'SKIPPED' | 'FREE', reviewedByUserId: string) {
    const inv = await this.prisma.paymentInvoice.findUnique({ where: { id: invoiceId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    return this.prisma.paymentInvoice.update({
      where: { id: invoiceId },
      data: { status, reviewedByUserId },
    });
  }

  async getInvoicesForCompany(companyId: string) {
    return this.prisma.paymentInvoice.findMany({
      where: { companyId },
      orderBy: { billingPeriod: 'desc' },
    });
  }

  async getAllInvoices(filters: { companyId?: string; status?: string; period?: string }) {
    return this.prisma.paymentInvoice.findMany({
      where: {
        ...(filters.companyId ? { companyId: filters.companyId } : {}),
        ...(filters.status ? { status: filters.status as any } : {}),
        ...(filters.period ? { billingPeriod: filters.period } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
