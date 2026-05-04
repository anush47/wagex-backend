import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalaryEngineService } from './services/salary-engine.service';
import { GenerateSalaryDto, SalaryQueryDto } from './dto/salary.dto';
import { SalaryStatus, SessionPayrollStatus, Prisma } from '@prisma/client';
import { SalaryGroupPreview, SalaryPreview } from './interfaces/salary-calculation.interface';
import { DeductionInstallment } from '../advances/advances.service';

@Injectable()
export class SalariesService {
  private readonly logger = new Logger(SalariesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: SalaryEngineService,
  ) {}

  async generatePreviews(dto: GenerateSalaryDto) {
    return this.engine.bulkGenerate(
      dto.companyId,
      new Date(dto.periodStartDate),
      new Date(dto.periodEndDate),
      dto.employeeIds,
      dto.attendanceStartDate ? new Date(dto.attendanceStartDate) : undefined,
      dto.attendanceEndDate ? new Date(dto.attendanceEndDate) : undefined,
      dto.payDate ? new Date(dto.payDate) : undefined,
    );
  }

  async saveDrafts(companyId: string, groupedPreviews: SalaryGroupPreview[]) {
    const savedSalaries: any[] = [];
    const previews = groupedPreviews.flatMap((g) => g.employees);

    for (const preview of previews) {
      const salary = await this.prisma.$transaction(async (tx) => {
        const startDate = new Date(preview.periodStartDate);
        const salaryData: Prisma.SalaryUncheckedCreateInput = {
          companyId: companyId,
          employeeId: preview.employeeId,
          month: startDate.getUTCMonth() + 1,
          year: startDate.getUTCFullYear(),
          periodStartDate: startDate,
          periodEndDate: new Date(preview.periodEndDate),
          payDate: preview.payDate ? new Date(preview.payDate) : new Date(),
          basicSalary: preview.basicSalary,
          otAmount: preview.otAmount,
          otAdjustment: preview.otAdjustment || 0,
          otAdjustmentReason: preview.otAdjustmentReason || null,
          otBreakdown: (preview.otBreakdown as Prisma.InputJsonValue) || [],
          holidayPayAmount: preview.holidayPayAmount || 0,
          holidayPayBreakdown: (preview.holidayPayBreakdown as Prisma.InputJsonValue) || [],
          noPayAmount: preview.noPayAmount,
          noPayBreakdown: (preview.noPayBreakdown as Prisma.InputJsonValue) || [],
          taxAmount: preview.taxAmount,
          components: preview.components as any,
          advanceDeduction: preview.advanceDeduction,
          advanceAdjustments: (preview.advanceAdjustments as any) || [],
          lateDeduction: preview.lateDeduction || 0,
          lateAdjustment: preview.lateAdjustment || 0,
          lateAdjustmentReason: preview.lateAdjustmentReason || null,
          holidayPayAdjustment: preview.holidayPayAdjustment || 0,
          holidayPayAdjustmentReason: preview.holidayPayAdjustmentReason || null,
          netSalary: preview.netSalary,
          remarks: preview.remarks || null,
          status: SalaryStatus.DRAFT,
        };

        const created = await tx.salary.upsert({
          where: {
            employeeId_periodStartDate_periodEndDate: {
              employeeId: preview.employeeId,
              periodStartDate: new Date(preview.periodStartDate),
              periodEndDate: new Date(preview.periodEndDate),
            },
          },
          update: salaryData,
          create: salaryData,
        });

        await tx.attendanceSession.updateMany({
          where: { salaryId: created.id },
          data: { salaryId: null, payrollStatus: SessionPayrollStatus.UNPROCESSED },
        });

        if (preview.sessionIds && preview.sessionIds.length > 0) {
          await tx.attendanceSession.updateMany({
            where: { id: { in: preview.sessionIds } },
            data: {
              salaryId: created.id,
              payrollStatus: SessionPayrollStatus.PROCESSED,
            },
          });
        }

        if (preview.advanceAdjustments && preview.advanceAdjustments.length > 0) {
          for (const adj of preview.advanceAdjustments) {
            const advance = await tx.salaryAdvance.findUnique({ where: { id: adj.advanceId } });
            if (advance) {
              const schedule = (advance.deductionSchedule as unknown as DeductionInstallment[]) || [];
              const toDay = (d: Date | string) => new Date(d).toISOString().split('T')[0];
              const previewStartDay = toDay(preview.periodStartDate);
              const updatedSchedule = schedule.map((s) => {
                if (toDay(s.periodStartDate) === previewStartDay) {
                  return { ...s, isDeducted: true, salaryId: created.id, deductedAt: new Date().toISOString() };
                }
                return s;
              });

              await tx.salaryAdvance.update({
                where: { id: adj.advanceId },
                data: {
                  deductionSchedule: updatedSchedule as any,
                  remainingAmount: { decrement: adj.amount },
                },
              });
            }
          }
        }

        return created;
      });
      savedSalaries.push(salary);
    }

    return { count: savedSalaries.length };
  }

  async findAll(query: SalaryQueryDto) {
    const { companyId, employeeId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SalaryWhereInput = {};
    if (companyId) where.companyId = companyId;
    if (employeeId) where.employeeId = employeeId;
    if (query.status) {
      if (typeof query.status === 'string' && query.status.includes(',')) {
        where.status = { in: query.status.split(',') as SalaryStatus[] };
      } else {
        where.status = query.status as SalaryStatus;
      }
    }

    const yearInt = query.year ? parseInt(String(query.year)) : undefined;
    const monthInt = query.month ? parseInt(String(query.month)) : undefined;

    if (yearInt) {
      if (monthInt) {
        where.periodEndDate = {
          gte: new Date(yearInt, monthInt - 1, 1),
          lte: new Date(yearInt, monthInt, 0, 23, 59, 59, 999),
        };
      } else {
        where.periodEndDate = {
          gte: new Date(yearInt, 0, 1),
          lte: new Date(yearInt, 11, 31, 23, 59, 59, 999),
        };
      }
    } else if (query.startDate || query.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.startDate) dateFilter.gte = new Date(query.startDate);
      if (query.endDate) dateFilter.lte = new Date(query.endDate);
      where.periodEndDate = dateFilter;
    }

    if (query.search) {
      const search = query.search;
      where.OR = [
        { remarks: { contains: search, mode: 'insensitive' } },
        { employee: { fullName: { contains: search, mode: 'insensitive' } } },
        { employee: { employeeNo: { equals: parseInt(search) || 0 } } },
      ];
    }
    if (query.excludeEpf) where.epfRecords = { none: {} };
    if (query.excludeEtf) where.etfRecords = { none: {} };
    if (query.policyIds) {
      const policyIds = Array.isArray(query.policyIds)
        ? query.policyIds
        : typeof query.policyIds === 'string'
        ? (query.policyIds as string).split(',')
        : [];
      if (policyIds.length > 0) {
        // Correcting to use relation id filter which is more standard
        where.employee = { ...(where.employee as object), policy: { id: { in: policyIds } } };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.salary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { periodEndDate: 'desc' },
        include: {
          employee: {
            select: {
              fullName: true,
              employeeNo: true,
              basicSalary: true,
              policy: {
                select: {
                  name: true,
                  settings: true,
                },
              },
            },
          },
          approvedBy: { select: { fullName: true } },
          payments: true,
          sessions: true,
          epfRecords: { select: { id: true } },
          etfRecords: { select: { id: true } },
        },
      }),
      this.prisma.salary.count({ where }),
    ]);

    return { items, total, page, limit };
  }


  async getSummary(companyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const pendingStatuses = [SalaryStatus.APPROVED, SalaryStatus.PARTIALLY_PAID];

    const [pendingSalaries, disbursedThisMonth] = await Promise.all([
      this.prisma.salary.findMany({
        where: { companyId, status: { in: pendingStatuses } },
        select: {
          netSalary: true,
          payDate: true,
          payments: { select: { amount: true } },
        },
      }),
      // All payments this month (salary + advance) for this company
      this.prisma.payment.aggregate({
        where: {
          companyId,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    let pendingAmount = 0;
    let pendingCount = 0;
    let overdueAmount = 0;
    let overdueCount = 0;

    for (const s of pendingSalaries) {
      const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = s.netSalary - paid;
      if (balance <= 0.01) continue;
      pendingAmount += balance;
      pendingCount += 1;
      if (s.payDate && s.payDate < now) {
        overdueAmount += balance;
        overdueCount += 1;
      }
    }

    return {
      disbursedThisMonth: disbursedThisMonth._sum.amount ?? 0,
      pendingAmount,
      pendingCount,
      overdueAmount,
      overdueCount,
    };
  }

  async findMySalaries(userId: string, query: SalaryQueryDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) throw new NotFoundException('Employee record not found for current user');

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SalaryWhereInput = {
      employeeId: employee.id,
      status: {
        in: [SalaryStatus.APPROVED, SalaryStatus.PARTIALLY_PAID, SalaryStatus.PAID],
      },
    };

    // Date filters
    const yearInt = query.year ? parseInt(String(query.year)) : undefined;
    const monthInt = query.month ? parseInt(String(query.month)) : undefined;

    if (yearInt) {
      if (monthInt) {
        where.periodEndDate = {
          gte: new Date(yearInt, monthInt - 1, 1),
          lte: new Date(yearInt, monthInt, 0, 23, 59, 59, 999),
        };
      } else {
        where.periodEndDate = {
          gte: new Date(yearInt, 0, 1),
          lte: new Date(yearInt, 11, 31, 23, 59, 59, 999),
        };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.salary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { periodEndDate: 'desc' },
        include: {
          employee: {
            select: {
              fullName: true,
              employeeNo: true,
              policy: {
                select: {
                  settings: true,
                },
              },
            },
          },
          approvedBy: { select: { fullName: true } },
          payments: {
            orderBy: { date: 'desc' },
          },
          sessions: true,
        },
      }),
      this.prisma.salary.count({ where }),
    ]);

    // Sanitize items - remove "no pay" details as requested
    const sanitizedItems = items.map((item) => {
      const { noPayAmount, noPayBreakdown, ...rest } = item as any;
      return rest;
    });

    return { items: sanitizedItems, total, page, limit };
  }

  async findOne(id: string) {
    const salary = await this.prisma.salary.findUnique({
      where: { id },
      include: {
        employee: true,
        payments: true,
        sessions: true,
        approvedBy: { select: { fullName: true } },
        epfRecords: true,
        etfRecords: true,
      },
    });
    if (!salary) throw new NotFoundException(`Salary ${id} not found`);
    return salary;
  }

  async update(id: string, data: Partial<SalaryPreview> & { sessionIds?: string[] }) {
    const toNum = (val: any) => {
      if (val === null || val === undefined || val === '') return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.salary.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException(`Salary ${id} not found`);

        const salaryData: Prisma.SalaryUncheckedUpdateInput = {
          basicSalary: data.basicSalary !== undefined ? toNum(data.basicSalary) : undefined,
          otAmount: data.otAmount !== undefined ? toNum(data.otAmount) : undefined,
          otBreakdown: (data.otBreakdown as Prisma.InputJsonValue) || undefined,
          noPayAmount: data.noPayAmount !== undefined ? toNum(data.noPayAmount) : undefined,
          noPayBreakdown: (data.noPayBreakdown as Prisma.InputJsonValue) || undefined,
          taxAmount: data.taxAmount !== undefined ? toNum(data.taxAmount) : undefined,
          advanceDeduction: data.advanceDeduction !== undefined ? toNum(data.advanceDeduction) : undefined,
          netSalary: data.netSalary !== undefined ? toNum(data.netSalary) : undefined,
          otAdjustment: data.otAdjustment !== undefined ? toNum(data.otAdjustment) : undefined,
          otAdjustmentReason: data.otAdjustmentReason || undefined,
          lateDeduction: data.lateDeduction !== undefined ? toNum(data.lateDeduction) : undefined,
          lateAdjustment: data.lateAdjustment !== undefined ? toNum(data.lateAdjustment) : undefined,
          lateAdjustmentReason: data.lateAdjustmentReason || undefined,
          holidayPayAdjustment: data.holidayPayAdjustment !== undefined ? toNum(data.holidayPayAdjustment) : undefined,
          holidayPayAdjustmentReason: data.holidayPayAdjustmentReason || undefined,
          advanceAdjustments: (data.advanceAdjustments as any) || undefined,
          components: (data.components as any) || undefined,
          remarks: data.remarks || undefined,
          payDate: data.payDate ? new Date(data.payDate) : undefined,
        };

        const updated = await tx.salary.update({
          where: { id },
          data: salaryData,
        });

        if (data.sessionIds) {
          await tx.attendanceSession.updateMany({
            where: { salaryId: id },
            data: { salaryId: null, payrollStatus: SessionPayrollStatus.UNPROCESSED },
          });

          if (data.sessionIds.length > 0) {
            await tx.attendanceSession.updateMany({
              where: { id: { in: data.sessionIds } },
              data: {
                salaryId: id,
                payrollStatus: SessionPayrollStatus.PROCESSED,
              },
            });
          }
        }

        return updated;
      });
    } catch (error: any) {
      this.logger.error(`Update failed for ${id}: ${error.message as string}`);
      throw error;
    }
  }


  async approve(id: string, userId: string) {
    const existing = await this.prisma.salary.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Salary ${id} not found`);

    if (existing.status !== SalaryStatus.DRAFT) {
      throw new BadRequestException('Only draft salaries can be approved');
    }

    return this.prisma.salary.update({
      where: { id },
      data: {
        status: SalaryStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: {
        employee: true,
        approvedBy: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.salary.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Salary ${id} not found`);

      await tx.attendanceSession.updateMany({
        where: { salaryId: id },
        data: {
          salaryId: null,
          payrollStatus: SessionPayrollStatus.UNPROCESSED,
        },
      });

      await tx.payment.deleteMany({ where: { salaryId: id } });

      const allAdvances = await tx.salaryAdvance.findMany({
        where: { employeeId: existing.employeeId },
      });

      for (const advance of allAdvances) {
        const schedule = (advance.deductionSchedule as unknown as DeductionInstallment[]) || [];
        let modified = false;
        let amountToRestore = 0;

        const updatedSchedule = schedule.map((s) => {
          if (new Date(s.periodStartDate).getTime() === existing.periodStartDate.getTime() && s.isDeducted) {
            modified = true;
            amountToRestore += s.amount;
            return { ...s, isDeducted: false, salaryId: undefined };
          }
          return s;
        });

        if (modified) {
          await tx.salaryAdvance.update({
            where: { id: advance.id },
            data: {
              deductionSchedule: updatedSchedule as any,
              remainingAmount: { increment: amountToRestore },
            },
          });
        }
      }

      return tx.salary.delete({ where: { id } });
    });
  }
}
