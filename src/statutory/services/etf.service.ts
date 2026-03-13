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
      periodStartDate: {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month - 1, 31),
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
      const etfEmployer = components.find(
        (c) => c.systemType === PayrollComponentSystemType.ETF_EMPLOYER,
      );

      let liableEarnings = 0;
      if (etfEmployer && etfEmployer.value > 0) {
        liableEarnings = etfEmployer.amount / (etfEmployer.value / 100);
      } else if (salary.basicSalary > 0) {
        liableEarnings = salary.basicSalary;
      }

      return {
        salaryId: salary.id,
        employeeName: salary.employee.fullName,
        employeeNo: salary.employee.employeeNo,
        liableEarnings,
        employerContribution: etfEmployer?.amount || 0,
        totalContribution: etfEmployer?.amount || 0,
      };
    });

    const totalContribution = previewItems.reduce(
      (sum, item) => sum + item.totalContribution,
      0,
    );

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
        throw new Error(
          `Salary for ${alreadyLinked.employee.fullName} is already linked to an ETF record.`,
        );
      }
    }

    return this.prisma.etfRecord.create({
      data: {
        ...data,
        companyId: data.companyId!,
        paidDate: data.paidDate ? new Date(data.paidDate) : null,
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
    if (month) where.month = month;
    if (year) where.year = year;

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
