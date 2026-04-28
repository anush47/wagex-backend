import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingConfigService } from './billing-config.service';
import { GetInvoicesQueryDto } from '../dto/billing.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

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

    // Grace period enforcement: block when outstanding EXCEEDS gracePeriodMonths
    const outstandingCount = await this.prisma.paymentInvoice.count({
      where: { companyId, status: { in: ['UNPAID', 'PENDING'] } },
    });
    if (outstandingCount > billing.gracePeriodMonths) {
      throw new BadRequestException(
        `You have ${outstandingCount} unpaid/pending invoice(s), which exceeds your grace period of ${billing.gracePeriodMonths} month(s). Please settle outstanding invoices before adding more.`,
      );
    }

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
    
    // Only preview for periods that don't exist yet
    const existing = await this.prisma.paymentInvoice.findMany({
      where: { companyId, billingPeriod: { in: billingPeriods } },
      select: { billingPeriod: true },
    });
    const existingPeriods = existing.map((e) => e.billingPeriod);
    const newPeriods = billingPeriods.filter((p) => !existingPeriods.includes(p));

    if (newPeriods.length === 0) {
      return {
        basePriceLkr: 0,
        addonPriceLkr: 0,
        discountLkr: 0,
        totalLkr: 0,
        periods: [],
        alreadyCreated: existingPeriods,
      };
    }

    return {
      ...this.calculatePrice(billing, newPeriods.length),
      periods: newPeriods,
      alreadyCreated: existingPeriods,
    };
  }

  async paymentPreview(companyId: string, invoiceIds: string[]) {
    const invoices = await this.prisma.paymentInvoice.findMany({
      where: { id: { in: invoiceIds }, companyId, status: 'UNPAID' },
    });

    if (invoices.length === 0) {
      throw new BadRequestException('No valid UNPAID invoices found for preview');
    }
    if (invoices.length !== invoiceIds.length) {
      throw new BadRequestException('Some selected invoices are not UNPAID or do not belong to this company');
    }

    const totalLkr = invoices.reduce((sum, inv) => sum + Number(inv.totalLkr), 0);
    const discountLkr = invoices.reduce((sum, inv) => sum + Number(inv.discountLkr), 0);

    return { totalLkr, discountLkr, invoiceCount: invoices.length, invoiceIds };
  }

  async uploadSlip(companyId: string, invoiceIds: string[], slipUrl: string | null, uploadedByUserId: string, notes?: string) {
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
      where: { id: { in: invoices.map((i) => i.id) }, status: 'UNPAID' },
      data: { 
        status: 'PENDING', 
        slipUrl, 
        uploadedByUserId,
        notes: notes || null
      },
    });

    return { updated: invoices.length };
  }

  async reviewInvoices(invoiceIds: string[], approved: boolean, reviewedByUserId: string, rejectionReason?: string, isFree?: boolean) {
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
        status: approved ? (isFree ? 'FREE' : 'PAID') : 'UNPAID',
        reviewedByUserId,
        rejectionReason: approved ? null : rejectionReason,
        paidAt: approved ? new Date() : null,
        ...(approved ? {} : { slipUrl: null }),
      },
    });

    return { updated: result.count, approved, isFree };
  }

  async setSpecialStatus(invoiceId: string, status: 'SKIPPED' | 'FREE', reviewedByUserId: string) {
    const inv = await this.prisma.paymentInvoice.findUnique({ where: { id: invoiceId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    return this.prisma.paymentInvoice.update({
      where: { id: invoiceId },
      data: { status, reviewedByUserId },
    });
  }

  async getInvoicesForCompany(companyId: string, query: GetInvoicesQueryDto) {
    const { page = 1, limit = 20, status, period } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      ...(status ? { status: status.includes(',') ? { in: status.split(',') as any } : status as any } : {}),
      ...(period ? { billingPeriod: period } : {}),
    };

    const [total, invoices] = await Promise.all([
      this.prisma.paymentInvoice.count({ where }),
      this.prisma.paymentInvoice.findMany({
        where,
        orderBy: { billingPeriod: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: this.groupInvoicesBySlip(invoices),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllInvoices(query: GetInvoicesQueryDto) {
    const { page = 1, limit = 20, companyId, status, period } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(companyId ? { companyId } : {}),
      ...(status ? { status: status.includes(',') ? { in: status.split(',') as any } : status as any } : {}),
      ...(period ? { billingPeriod: period } : {}),
    };

    const [total, invoices] = await Promise.all([
      this.prisma.paymentInvoice.count({ where }),
      this.prisma.paymentInvoice.findMany({
        where,
        include: {
          companyBilling: { include: { company: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: this.groupInvoicesBySlip(invoices),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private groupInvoicesBySlip(invoices: any[]) {
    return invoices.reduce((acc: any[], inv) => {
      // Group by slipUrl if present, or by (companyId + notes + timestamp) if it's a manual reference, otherwise by id
      const key = inv.slipUrl || (inv.notes ? `${inv.companyId}-${inv.notes}-${new Date(inv.updatedAt).getTime()}` : inv.id);
      const existing = acc.find((g) => g.id === key);

      if (existing) {
        existing.invoices.push(inv);
        existing.totalLkr = Number(existing.totalLkr) + Number(inv.totalLkr);
        existing.discountLkr = Number(existing.discountLkr) + Number(inv.discountLkr);
      } else {
        acc.push({
          id: key,
          slipUrl: inv.slipUrl,
          companyName: inv.companyBilling?.company?.name || inv.companyId.substring(0, 8),
          companyId: inv.companyId,
          status: inv.status,
          totalLkr: Number(inv.totalLkr),
          discountLkr: Number(inv.discountLkr),
          invoices: [inv],
          createdAt: inv.createdAt,
          rejectionReason: inv.rejectionReason,
          notes: inv.notes,
        });
      }
      return acc;
    }, []);
  }

  async getAdminStats() {
    const [pending, unpaid, paidAllTime] = await Promise.all([
      this.prisma.paymentInvoice.aggregate({
        where: { status: 'PENDING' },
        _count: true,
        _sum: { totalLkr: true },
      }),
      this.prisma.paymentInvoice.aggregate({
        where: { status: 'UNPAID' },
        _count: true,
        _sum: { totalLkr: true },
      }),
      this.prisma.paymentInvoice.aggregate({
        where: { status: 'PAID' },
        _count: true,
        _sum: { totalLkr: true },
      }),
    ]);

    return {
      pending: { count: pending._count, totalLkr: pending._sum.totalLkr || 0 },
      unpaid: { count: unpaid._count, totalLkr: unpaid._sum.totalLkr || 0 },
      paidAllTime: { count: paidAllTime._count, totalLkr: paidAllTime._sum.totalLkr || 0 },
    };
  }
}
