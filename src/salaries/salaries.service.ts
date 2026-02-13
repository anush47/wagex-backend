import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalaryEngineService } from './services/salary-engine.service';
import { GenerateSalaryDto, SalaryQueryDto } from './dto/salary.dto';
import { SalaryStatus } from '@prisma/client';

@Injectable()
export class SalariesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly engine: SalaryEngineService,
    ) { }

    async generatePreviews(dto: GenerateSalaryDto) {
        return this.engine.bulkGenerate(
            dto.companyId,
            new Date(dto.periodStartDate),
            new Date(dto.periodEndDate),
            dto.employeeIds,
        );
    }

    async saveDrafts(previews: any[]) {
        const savedSalaries: any[] = [];

        for (const preview of previews) {
            const salary = await this.prisma.$transaction(async (tx) => {
                // 1. Create Salary Draft
                const created = await tx.salary.create({
                    data: {
                        companyId: preview.companyId || (await tx.employee.findUnique({ where: { id: preview.employeeId } }))?.companyId as string,
                        employeeId: preview.employeeId,
                        periodStartDate: preview.periodStartDate,
                        periodEndDate: preview.periodEndDate,
                        payDate: preview.payDate || new Date(), // Default to now if not provided
                        basicSalary: preview.basicSalary,
                        otAmount: preview.otAmount,
                        otBreakdown: preview.otBreakdown,
                        noPayAmount: preview.noPayAmount,
                        noPayBreakdown: preview.noPayBreakdown,
                        taxAmount: preview.taxAmount,
                        components: preview.components,
                        advanceDeduction: preview.advanceDeduction,
                        netSalary: preview.netSalary,
                        status: SalaryStatus.DRAFT,
                    },
                });

                // 2. Mark Advances as Deducted if applicable
                if (preview.advanceAdjustments) {
                    for (const adj of preview.advanceAdjustments) {
                        const advance = await tx.salaryAdvance.findUnique({ where: { id: adj.advanceId } });
                        if (advance) {
                            const schedule = (advance.deductionSchedule as any[]) || [];
                            const updatedSchedule = schedule.map(s => {
                                if (new Date(s.periodStartDate).getTime() === new Date(preview.periodStartDate).getTime()) {
                                    return { ...s, isDeducted: true };
                                }
                                return s;
                            });

                            await tx.salaryAdvance.update({
                                where: { id: adj.advanceId },
                                data: {
                                    deductionSchedule: updatedSchedule,
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

        return savedSalaries;
    }

    async findAll(query: SalaryQueryDto) {
        const { companyId, employeeId, startDate, endDate, status, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (companyId) where.companyId = companyId;
        if (employeeId) where.employeeId = employeeId;
        if (status) where.status = status;
        if (startDate || endDate) {
            where.periodStartDate = {};
            if (startDate) where.periodStartDate.gte = new Date(startDate);
            if (endDate) where.periodStartDate.lte = new Date(endDate);
        }

        const [items, total] = await Promise.all([
            this.prisma.salary.findMany({
                where,
                skip,
                take: limit,
                orderBy: { periodStartDate: 'desc' },
                include: { employee: { select: { fullName: true, employeeNo: true } } },
            }),
            this.prisma.salary.count({ where }),
        ]);

        return { items, total, page, limit };
    }

    async findOne(id: string) {
        const salary = await this.prisma.salary.findUnique({
            where: { id },
            include: { employee: true, payments: true },
        });
        if (!salary) throw new NotFoundException(`Salary ${id} not found`);
        return salary;
    }
}
