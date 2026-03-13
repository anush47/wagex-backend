import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEpfDto, EpfQueryDto, GenerateEpfDto, UpdateEpfDto } from '../dto/epf.dto';
import { PayrollComponentSystemType } from '../../policies/dto/salary-components-policy.dto';

@Injectable()
export class EpfService {
  constructor(private readonly prisma: PrismaService) {}

  async generatePreview(dto: GenerateEpfDto) {
    const { companyId, month, year, salaryIds } = dto;

    const where: any = {
      companyId,
      periodStartDate: {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month - 1, 31),
      },
      epfRecords: {
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
      const epfEmployee = components.find(
        (c) => c.systemType === PayrollComponentSystemType.EPF_EMPLOYEE,
      );
      const eppEmployer = components.find(
        (c) => c.systemType === PayrollComponentSystemType.EPF_EMPLOYER,
      );

      // Total Liable Earnings for EPF is usually the base for these percentages
      // We can derive it: amount / (value / 100)
      let liableEarnings = 0;
      if (epfEmployee && epfEmployee.value > 0) {
        liableEarnings = epfEmployee.amount / (epfEmployee.value / 100);
      } else if (salary.basicSalary > 0) {
        liableEarnings = salary.basicSalary; // Fallback
      }

      return {
        salaryId: salary.id,
        employeeName: salary.employee.fullName,
        employeeNo: salary.employee.employeeNo,
        liableEarnings,
        employeeContribution: epfEmployee?.amount || 0,
        employerContribution: eppEmployer?.amount || 0,
        totalContribution: (epfEmployee?.amount || 0) + (eppEmployer?.amount || 0),
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

  async create(dto: CreateEpfDto) {
    const { salaryIds, ...data } = dto;

    // Strict Enforcement: Ensure salaries are not already linked to another EPF record
    if (salaryIds && salaryIds.length > 0) {
      const alreadyLinked = await this.prisma.salary.findFirst({
        where: {
          id: { in: salaryIds },
          epfRecords: { some: {} },
        },
        include: { employee: true },
      });

      if (alreadyLinked) {
        throw new Error(
          `Salary for ${alreadyLinked.employee.fullName} is already linked to an EPF record.`,
        );
      }
    }

    return this.prisma.epfRecord.create({
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

  async findAll(query: EpfQueryDto) {
    const { companyId, month, year, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (month) where.month = month;
    if (year) where.year = year;

    const [items, total] = await Promise.all([
      this.prisma.epfRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      this.prisma.epfRecord.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const record = await this.prisma.epfRecord.findUnique({
      where: { id },
      include: {
        salaries: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!record) throw new NotFoundException(`EPF Record ${id} not found`);
    return record;
  }

  async update(id: string, dto: UpdateEpfDto) {
    return this.prisma.epfRecord.update({
      where: { id },
      data: {
        ...dto,
        paidDate: dto.paidDate ? new Date(dto.paidDate) : undefined,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.epfRecord.delete({ where: { id } });
  }
}
