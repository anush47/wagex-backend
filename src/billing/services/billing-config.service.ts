import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateBillingConfigDto, GetCompaniesQueryDto } from '../dto/billing.dto';

@Injectable()
export class BillingConfigService {
  private readonly logger = new Logger(BillingConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDefault() {
    return this.prisma.companyBilling.findFirst({ where: { isDefault: true } });
  }

  /** Returns company-specific config if it exists, otherwise falls back to the default.
   *  Always includes the live employee count for the company, and an `isCustom` flag. */
  async getForCompany(companyId: string) {
    const billing = await this.prisma.companyBilling.findUnique({ where: { companyId } });
    if (billing) return { ...billing, isCustom: true };

    const def = await this.getDefault();
    if (!def) throw new NotFoundException('No billing config found and no default has been seeded');

    const employeeCount = await this.prisma.employee.count({
      where: { companyId, status: 'ACTIVE' },
    });

    return { ...def, companyId, isCustom: false, employeeCount };
  }

  /** Explicitly create a company-specific config by copying the current default.
   *  Idempotent — returns existing record if one already exists. */
  async createCustomForCompany(companyId: string) {
    const existing = await this.prisma.companyBilling.findUnique({ where: { companyId } });
    if (existing) return existing;

    const [def, employeeCount] = await Promise.all([
      this.getDefault(),
      this.prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
    ]);

    if (!def) throw new NotFoundException('No default billing config found. Seed a default config before creating company-specific configs.');

    return this.prisma.companyBilling.create({
      data: {
        companyId,
        isDefault: false,
        basePriceLkr: def.basePriceLkr,
        employeeTiers: def.employeeTiers as any,
        services: def.services as any,
        multiMonthDiscounts: def.multiMonthDiscounts as any,
        gracePeriodMonths: def.gracePeriodMonths,
        suspensionLevel: 'NONE',
        employeeCount,
      },
    });
  }

  /** Sync employee count — only applies if a custom config exists for the company. */
  async syncEmployeeCount(companyId: string) {
    const billing = await this.prisma.companyBilling.findUnique({ where: { companyId } });
    if (!billing || billing.overrideActive) return;
    const count = await this.prisma.employee.count({ where: { companyId, status: 'ACTIVE' } });
    await this.prisma.companyBilling.update({
      where: { companyId },
      data: { employeeCount: count },
    });
  }

  async forceRecalculate(companyId: string) {
    const [count, billing] = await Promise.all([
      this.prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.companyBilling.findUnique({ where: { companyId } }),
    ]);
    if (!billing) return { message: 'No custom config — company uses the default' };
    return this.prisma.companyBilling.update({
      where: { companyId },
      data: { employeeCount: count },
    });
  }

  async update(companyId: string, dto: UpdateBillingConfigDto) {
    const billing = await this.prisma.companyBilling.findUnique({ where: { companyId } });
    if (!billing) throw new NotFoundException(`No custom billing config found for company ${companyId}. Create one first.`);
    return this.prisma.companyBilling.update({
      where: { companyId },
      data: dto as any,
    });
  }

  async updateDefault(dto: UpdateBillingConfigDto) {
    const def = await this.getDefault();
    if (!def) throw new NotFoundException('No default billing config found');
    return this.prisma.companyBilling.update({
      where: { id: def.id },
      data: dto as any,
    });
  }

  /** Returns paginated companies with their billing config. */
  async listAll(query: GetCompaniesQueryDto) {
    const { page = 1, limit = 20, type, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    const conditions: any[] = [];

    if (search) {
      conditions.push({ name: { contains: search, mode: 'insensitive' } });
    }
    
    if (type === 'CUSTOM') {
      conditions.push({ companyBilling: { overrideActive: true } });
    } else if (type === 'DEFAULT') {
      conditions.push({
        OR: [
          { companyBilling: null },
          { companyBilling: { overrideActive: false } }
        ]
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const [total, companies] = await Promise.all([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        select: { 
          id: true, 
          name: true,
          companyBilling: {
            select: {
              id: true,
              suspensionLevel: true,
              basePriceLkr: true,
              employeeCount: true,
              overrideActive: true,
            }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    const data = companies.map((c) => ({
      company: { id: c.id, name: c.name },
      billing: c.companyBilling,
      hasCustomConfig: !!c.companyBilling,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async ensureDefaultExists() {
    const existing = await this.getDefault();
    if (existing) return existing;
    return this.prisma.companyBilling.create({
      data: {
        isDefault: true,
        companyId: null,
        basePriceLkr: 3000,
        employeeTiers: [],
        services: [],
        multiMonthDiscounts: [
          { months: 3, discountPct: 5 },
          { months: 6, discountPct: 10 },
          { months: 12, discountPct: 15 },
        ],
        gracePeriodMonths: 2,
        suspensionLevel: 'NONE',
      },
    });
  }
}
