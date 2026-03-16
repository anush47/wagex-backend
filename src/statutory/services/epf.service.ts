import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEpfDto, EpfQueryDto, GenerateEpfDto, UpdateEpfDto } from '../dto/epf.dto';
import { PayrollComponentSystemType } from '../../policies/dto/salary-components-policy.dto';

@Injectable()
export class EpfService {
  constructor(private readonly prisma: PrismaService) {}

  async generatePreview(dto: GenerateEpfDto) {
    const referenceNo = await this.generateReferenceNo();
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

      // Total Liable Earnings for EPF is usually the base for these percentages
      // We can derive it: amount / (value / 100)
      let liableEarnings = 0;
      if (epfEmployee && epfEmployee.value > 0) {
        liableEarnings = epfEmployee.amount / (epfEmployee.value / 100);
      } else if (salary.basicSalary > 0) {
        liableEarnings = salary.basicSalary; // Fallback
      }

      // Employer contribution is stored as employerAmount on the EPF_EMPLOYEE component
      // OR as a separate EPF_EMPLOYER component
      const epfEmployer = components.find(
        (c) => c.systemType === PayrollComponentSystemType.EPF_EMPLOYER,
      );
      const employerContribution = epfEmployer?.amount || epfEmployee?.employerAmount || 0;

      return {
        salaryId: salary.id,
        employeeName: salary.employee.fullName,
        employeeNo: salary.employee.employeeNo,
        liableEarnings,
        employeeContribution: epfEmployee?.amount || 0,
        employerContribution: employerContribution,
        totalContribution: (epfEmployee?.amount || 0) + employerContribution,
      };
    });

    const totalContribution = previewItems.reduce(
      (sum, item) => sum + item.totalContribution,
      0,
    );

    return {
      month,
      year,
      referenceNo,
      items: previewItems,
      totalContribution,
    };
  }

  private async generateReferenceNo() {
    // For now, return a placeholder as per user request
    return '11111111111';
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

    // Ensure only one EPF record exists per month/year per company
    const existingRecord = await this.prisma.epfRecord.findFirst({
      where: {
        companyId: data.companyId,
        month: data.month,
        year: data.year,
      },
    });

    if (existingRecord) {
      throw new Error(`An EPF record already exists for ${data.month}/${data.year}.`);
    }

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

    return this.prisma.epfRecord.create({
      data: {
        ...data,
        companyId: data.companyId!,
        referenceNo: data.referenceNo || (await this.generateReferenceNo()),
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

  async findAll(query: EpfQueryDto) {
    const { companyId, month, year, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (month && !isNaN(month)) where.month = month;
    if (year && !isNaN(year)) where.year = year;

    if (query.search) {
      const search = query.search;
      where.OR = [
        { referenceNo: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
        // Try to match search with month names if possible, or just leave it to numbers
      ];

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
