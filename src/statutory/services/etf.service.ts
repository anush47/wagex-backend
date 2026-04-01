import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEtfDto, EtfQueryDto, GenerateEtfDto, UpdateEtfDto } from '../dto/etf.dto';
import { PayrollComponentSystemType } from '../../policies/dto/salary-components-policy.dto';

@Injectable()
export class EtfService {
  constructor(private readonly prisma: PrismaService) {}

  async generatePreview(dto: GenerateEtfDto) {
    const { companyId, month, year, salaryIds } = dto;

    const where: any = {
      companyId,
      periodEndDate: {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0, 23, 59, 59, 999),
      },
      etfRecords: {
        none: {},
      },
      // Consider salaries regardless of status as per user request
    };

    if (salaryIds && salaryIds.length > 0) {
      where.id = { in: salaryIds };
    }

    const salaries = await this.prisma.salary.findMany({
      where,
      include: {
        employee: {
          select: {
            fullName: true,
            employeeNo: true,
          },
        },
      },
    });

    const previewItems = salaries.map((salary) => {
      const components = (salary.components as any[]) || [];
      const etfEmployer = components.find((c) => c.systemType === PayrollComponentSystemType.ETF_EMPLOYER);

      // Calculate liable earnings from the employer contribution amount
      let liableEarnings = 0;
      if (etfEmployer && etfEmployer.employerAmount > 0 && etfEmployer.employerValue > 0) {
        liableEarnings = etfEmployer.employerAmount / (etfEmployer.employerValue / 100);
      } else if (salary.basicSalary > 0) {
        liableEarnings = salary.basicSalary;
      }

      return {
        salaryId: salary.id,
        employeeName: salary.employee.fullName,
        employeeNo: salary.employee.employeeNo,
        liableEarnings,
        employerContribution: etfEmployer?.employerAmount || 0,
        totalContribution: etfEmployer?.employerAmount || 0,
      };
    });

    const totalContribution = previewItems.reduce((sum, item) => sum + item.totalContribution, 0);

    return {
      month,
      year,
      items: previewItems,
      totalContribution,
    };
  }

  async create(dto: CreateEtfDto) {
    const { salaryIds, ...data } = dto;

    // Strict Enforcement: Ensure salaries are not already linked to another ETF record
    if (salaryIds && salaryIds.length > 0) {
      const alreadyLinked = await this.prisma.salary.findFirst({
        where: {
          id: { in: salaryIds },
          etfRecords: { some: {} },
        },
        include: { employee: true },
      });

      if (alreadyLinked) {
        throw new Error(`Salary for ${alreadyLinked.employee.fullName} is already linked to an ETF record.`);
      }
    }

    // Removed single record per month check to allow multiple batches.
    // Salaries are already checked for existing links above.

    // Fetch company defaults for statutory details
    const company = await this.prisma.company.findUnique({
      where: { id: data.companyId! },
      select: {
        defaultStatutoryPaymentMethod: true,
        statutoryBankName: true,
        statutoryBankBranch: true,
        statutoryBankCode: true,
        statutoryBranchCode: true,
      },
    });

    return this.prisma.etfRecord.create({
      data: {
        ...data,
        companyId: data.companyId!,
        paidDate: data.paidDate ? new Date(data.paidDate) : null,
        paymentMethod: data.paymentMethod || company?.defaultStatutoryPaymentMethod || 'BANK_TRANSFER',
        bankName: data.bankName || company?.statutoryBankName,
        bankBranch: data.bankBranch || company?.statutoryBankBranch,
        bankCode: data.bankCode || company?.statutoryBankCode,
        branchCode: data.branchCode || company?.statutoryBranchCode,
        salaries: {
          connect: salaryIds?.map((id) => ({ id })) || [],
        },
      },
    });
  }

  async findAll(query: EtfQueryDto) {
    const { companyId, month, year, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (month && !isNaN(month)) where.month = month;
    if (year && !isNaN(year)) where.year = year;

    if (query.search) {
      const search = query.search;
      where.OR = [{ remarks: { contains: search, mode: 'insensitive' } }];

      // If search is a number, try to match month or year
      const searchNum = parseInt(search);
      if (!isNaN(searchNum)) {
        where.OR.push({ year: searchNum });
        if (searchNum >= 1 && searchNum <= 12) {
          where.OR.push({ month: searchNum });
        }
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.etfRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      this.prisma.etfRecord.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const record = await this.prisma.etfRecord.findUnique({
      where: { id },
      include: {
        salaries: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!record) throw new NotFoundException(`ETF Record ${id} not found`);
    return record;
  }

  async update(id: string, dto: UpdateEtfDto) {
    return this.prisma.etfRecord.update({
      where: { id },
      data: {
        ...dto,
        paidDate: dto.paidDate ? new Date(dto.paidDate) : undefined,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.etfRecord.delete({ where: { id } });
  }
}
