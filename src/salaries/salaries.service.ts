import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalaryEngineService } from './services/salary-engine.service';
import { GenerateSalaryDto, SalaryQueryDto } from './dto/salary.dto';
import { SalaryStatus, SessionPayrollStatus } from '@prisma/client';

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

    async saveDrafts(companyId: string, groupedPreviews: any[]) {
        const savedSalaries: any[] = [];
        const previews = groupedPreviews.flatMap(g => g.employees);

        for (const preview of previews) {
            const salary = await this.prisma.$transaction(async (tx) => {
                // 1. Upsert Salary Draft
                const salaryData = {
                    companyId: companyId,
                    employeeId: preview.employeeId,
                    periodStartDate: new Date(preview.periodStartDate),
                    periodEndDate: new Date(preview.periodEndDate),
                    payDate: preview.payDate || new Date(),
                    basicSalary: preview.basicSalary,
                    otAmount: preview.otAmount,
                    otAdjustment: preview.otAdjustment || 0,
                    otAdjustmentReason: preview.otAdjustmentReason || null,
                    otBreakdown: preview.otBreakdown,
                    holidayPayAmount: preview.holidayPayAmount || 0,
                    holidayPayBreakdown: preview.holidayPayBreakdown,
                    noPayAmount: preview.noPayAmount,
                    noPayBreakdown: preview.noPayBreakdown,
                    taxAmount: preview.taxAmount,
                    components: preview.components,
                    advanceDeduction: preview.advanceDeduction,
                    advanceAdjustments: preview.advanceAdjustments || [],
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
                        }
                    },
                    update: salaryData,
                    create: salaryData,
                });

                // Link Attendance Sessions
                await tx.attendanceSession.updateMany({
                    where: { salaryId: created.id },
                    data: { salaryId: null, payrollStatus: 'UNPROCESSED' }
                });

                if (preview.sessionIds && preview.sessionIds.length > 0) {
                    await tx.attendanceSession.updateMany({
                        where: { id: { in: preview.sessionIds } },
                        data: {
                            salaryId: created.id,
                            payrollStatus: 'PROCESSED'
                        }
                    });
                }

                // 2. Mark Advances as Deducted if applicable
                if (preview.advanceAdjustments && preview.advanceAdjustments.length > 0) {
                    for (const adj of preview.advanceAdjustments) {
                        const advance = await tx.salaryAdvance.findUnique({ where: { id: adj.advanceId } });
                        if (advance) {
                            const schedule = (advance.deductionSchedule as any[]) || [];
                            const updatedSchedule = schedule.map(s => {
                                // Match by period start date
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

        return { count: savedSalaries.length };
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
        if (query.excludeEpf) {
            where.epfRecords = { none: {} };
        }
        if (query.excludeEtf) {
            where.etfRecords = { none: {} };
        }

        const [items, total] = await Promise.all([
            this.prisma.salary.findMany({
                where,
                skip,
                take: limit,
                orderBy: { periodStartDate: 'desc' },
                include: { 
                    employee: { select: { fullName: true, employeeNo: true } },
                    approvedBy: { select: { fullName: true } },
                    payments: true
                },
            }),
            this.prisma.salary.count({ where }),
        ]);

        return { items, total, page, limit };
    }

    async findOne(id: string) {
        const salary = await this.prisma.salary.findUnique({
            where: { id },
            include: { employee: true, payments: true, approvedBy: { select: { fullName: true } } },
        });
        if (!salary) throw new NotFoundException(`Salary ${id} not found`);
        return salary;
    }

    async update(id: string, data: any) {
        const toNum = (val: any) => {
            if (val === null || val === undefined || val === '') return 0;
            const num = Number(val);
            return isNaN(num) ? 0 : num;
        };

        try {
            return await this.prisma.$transaction(async (tx) => {
                const existing = await tx.salary.findUnique({ where: { id } });
                if (!existing) throw new NotFoundException(`Salary ${id} not found`);

                const salaryData: any = {
                    basicSalary: toNum(data.basicSalary),
                    otAmount: toNum(data.otAmount),
                    otBreakdown: data.otBreakdown || [],
                    noPayAmount: toNum(data.noPayAmount),
                    noPayBreakdown: data.noPayBreakdown || [],
                    taxAmount: toNum(data.taxAmount),
                    advanceDeduction: toNum(data.advanceDeduction),
                    netSalary: toNum(data.netSalary),
                    otAdjustment: toNum(data.otAdjustment),
                    otAdjustmentReason: data.otAdjustmentReason || null,
                    recoveryAdjustment: toNum(data.recoveryAdjustment),
                    recoveryAdjustmentReason: data.recoveryAdjustmentReason || null,
                    lateDeduction: toNum(data.lateDeduction),
                    lateAdjustment: toNum(data.lateAdjustment),
                    lateAdjustmentReason: data.lateAdjustmentReason || null,
                    holidayPayAdjustment: toNum(data.holidayPayAdjustment),
                    holidayPayAdjustmentReason: data.holidayPayAdjustmentReason || null,
                    advanceAdjustments: data.advanceAdjustments || [],
                    components: data.components || [],
                    remarks: data.remarks || null,
                };

                if (data.payDate) {
                    salaryData.payDate = new Date(data.payDate);
                }

                const updated = await tx.salary.update({
                    where: { id },
                    data: salaryData,
                });

                if (data.sessionIds && Array.isArray(data.sessionIds)) {
                    await tx.attendanceSession.updateMany({
                        where: { salaryId: id },
                        data: { salaryId: null, payrollStatus: SessionPayrollStatus.UNPROCESSED }
                    });

                    if (data.sessionIds.length > 0) {
                        await tx.attendanceSession.updateMany({
                            where: { id: { in: data.sessionIds } },
                            data: {
                                salaryId: id,
                                payrollStatus: SessionPayrollStatus.PROCESSED
                            }
                        });
                    }
                }

                return updated;
            });
        } catch (error) {
            console.error(`[SALARIES_SERVICE] Update failed for ${id}:`, error);
            throw error;
        }
    }

    async approve(id: string, userId: string) {
        try {
            const existing = await this.prisma.salary.findUnique({ where: { id } });
            if (!existing) throw new NotFoundException(`Salary ${id} not found`);

            if (existing.status !== SalaryStatus.DRAFT) {
                throw new BadRequestException('Only draft salaries can be approved');
            }

            return await this.prisma.salary.update({
                where: { id },
                data: {
                    status: SalaryStatus.APPROVED,
                    approvedById: userId,
                    approvedAt: new Date()
                },
                include: {
                    employee: true,
                    approvedBy: true
                }
            });
        } catch (error) {
            console.error(`[SALARIES_SERVICE] Approval failed for ${id}:`, error);
            throw error;
        }
    }

    async delete(id: string) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const existing = await tx.salary.findUnique({ where: { id } });
                if (!existing) throw new NotFoundException(`Salary ${id} not found`);

                // Unlink attendance sessions
                await tx.attendanceSession.updateMany({
                    where: { salaryId: id },
                    data: { 
                        salaryId: null, 
                        payrollStatus: SessionPayrollStatus.UNPROCESSED 
                    }
                });

                // Delete related payments
                const payments = await tx.payment.findMany({ where: { salaryId: id } });
                if (payments.length > 0) {
                    await tx.payment.deleteMany({ where: { salaryId: id } });
                }

                // Since Prisma JSON filtering might be complex, let's just reverse based on the existing salary periods
                const allAdvances = await tx.salaryAdvance.findMany({
                    where: { employeeId: existing.employeeId }
                });

                for (const advance of allAdvances) {
                    const schedule = (advance.deductionSchedule as any[]) || [];
                    let modified = false;
                    let amountToRestore = 0;
                    
                    const updatedSchedule = schedule.map(s => {
                        if (new Date(s.periodStartDate).getTime() === existing.periodStartDate.getTime() && s.isDeducted) {
                            modified = true;
                            amountToRestore += s.amount;
                            return { ...s, isDeducted: false };
                        }
                        return s;
                    });

                    if (modified) {
                        await tx.salaryAdvance.update({
                            where: { id: advance.id },
                            data: {
                                deductionSchedule: updatedSchedule,
                                remainingAmount: { increment: amountToRestore }
                            }
                        });
                    }
                }

                // Finally delete the salary
                return await tx.salary.delete({
                    where: { id }
                });
            });
        } catch (error) {
            console.error(`[SALARIES_SERVICE] Delete failed for ${id}:`, error);
            throw error;
        }
    }
}
