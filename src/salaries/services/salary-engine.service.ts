import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PoliciesService } from '../../policies/policies.service';
import { AttendanceProcessingService } from '../../attendance/services/attendance-processing.service';
import { GenerateSalaryDto } from '../dto/salary.dto';
import { PayCycleFrequency } from '../../policies/dto/payroll-settings-policy.dto';
import { PayrollComponentType } from '../../policies/dto/salary-components-policy.dto';
import { SalaryStatus } from '@prisma/client';
import { merge } from 'lodash';

@Injectable()
export class SalaryEngineService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly policiesService: PoliciesService,
        private readonly attendanceService: AttendanceProcessingService,
    ) { }

    async calculatePreview(companyId: string, periodStart: Date, periodEnd: Date, employeeId: string) {
        // 1. Get Effective Policy
        const policy = await this.policiesService.getEffectivePolicy(employeeId);

        // 2. Fetch Employee Data
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
        });
        if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

        // 3. Resolve Basic Salary for Period
        const payrollConfig = policy.payrollConfiguration;
        const baseRateDivisor = payrollConfig?.baseRateDivisor || 30;
        let basicSalary = employee.basicSalary;

        if (payrollConfig && payrollConfig.frequency !== PayCycleFrequency.MONTHLY) {
            // For non-monthly, we calculate based on the period duration
            const dailyRate = basicSalary / baseRateDivisor;
            const diffTime = Math.abs(periodEnd.getTime() - periodStart.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            basicSalary = dailyRate * diffDays;
        }

        const hourlyRate = basicSalary / (payrollConfig?.otDivisor || 200);

        // 4. Fetch Attendance Data for Period
        const sessions = await this.prisma.attendanceSession.findMany({
            where: {
                employeeId,
                date: {
                    gte: periodStart,
                    lte: periodEnd,
                },
            },
        });

        // 5. Calculate OT Breakdown
        let totalOtAmount = 0;
        const otBreakdown = [
            { type: 'NORMAL', hours: 0, amount: 0 },
            { type: 'DOUBLE', hours: 0, amount: 0 },
            { type: 'TRIPLE', hours: 0, amount: 0 },
        ];

        sessions.forEach(session => {
            if (session.overtimeMinutes && session.overtimeMinutes > 0) {
                const hours = session.overtimeMinutes / 60;
                let rate = payrollConfig?.otNormalRate || 1.5;
                let typeIdx = 0; // NORMAL

                if (session.workHolidayId) {
                    rate = payrollConfig?.otTripleRate || 3.0;
                    typeIdx = 2; // TRIPLE
                } else if (new Date(session.date).getDay() === 0) { // Sunday
                    rate = payrollConfig?.otDoubleRate || 2.0;
                    typeIdx = 1; // DOUBLE
                }

                const amount = hours * hourlyRate * rate;
                otBreakdown[typeIdx].hours += hours;
                otBreakdown[typeIdx].amount += amount;
                totalOtAmount += amount;
            }
        });

        // 6. Calculate No-Pay Breakdown
        // If autoDeductUnpaidLeaves is active, we check for missing days
        let totalNoPayAmount = 0;
        const noPayBreakdown = [
            { type: 'ABSENCE', count: 0, amount: 0 },
            { type: 'UNPAID_LEAVE', count: 0, amount: 0 },
        ];

        if (payrollConfig?.autoDeductUnpaidLeaves) {
            const dailyRate = basicSalary / baseRateDivisor;

            // 1. Calculate Expected Days (Business logic: assume all days in period are working for now, unless policy says otherwise)
            // In a more complex system, we'd check the workingDays policy pattern.
            const diffTime = Math.abs(periodEnd.getTime() - periodStart.getTime());
            const totalDaysInPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            // 2. Count Present Days + Paid Leave Days
            const presentDays = sessions.length; // Session exists = present or leave
            const leaveSessions = sessions.filter(s => s.isOnLeave || s.isHalfDay);

            // For now, simplify: if no session exists for a day, it's an absence.
            // But we only have sessions for days where there's an event or leave.
            // We need to iterate through the date range.
            for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
                const dayStr = d.toISOString().split('T')[0];
                const session = sessions.find(s => s.date.toISOString().split('T')[0] === dayStr);

                if (!session) {
                    // Check if it's a working day in policy
                    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
                    const dayName = dayNames[d.getDay()];
                    const dayConfig = (policy.workingDays?.defaultPattern as any)?.[dayName];

                    if (dayConfig && dayConfig.type !== 'OFF') {
                        noPayBreakdown[0].count++;
                        noPayBreakdown[0].amount += dailyRate;
                        totalNoPayAmount += dailyRate;
                    }
                } else if (session.isOnLeave) {
                    // Check if the leave was UNPAID (This metadata isn't explicitly on session yet, but we'll assume it for now if flagged as UNPAID in a future step)
                    // Currently leaveIntegrationService doesn't pass 'unpaid' status to session.
                    // Placeholder for now.
                }
            }
        }

        // 7. Salary Components (Additions / Deductions)
        const components = policy.salaryComponents?.components || [];
        const componentResults = components.map(comp => {
            let amount = 0;
            if (comp.type === PayrollComponentType.FLAT_AMOUNT) {
                amount = comp.value;
            } else if (comp.type === PayrollComponentType.PERCENTAGE_BASIC) {
                amount = (basicSalary * comp.value) / 100;
            } else if (comp.type === PayrollComponentType.PERCENTAGE_GROSS) {
                // Gross = Basic + OT + Additions (but usually excluding the one being calculated)
                // For simplicity, we use (Basic + OT) as the base for PERCENTAGE_GROSS here
                amount = ((basicSalary + totalOtAmount) * comp.value) / 100;
            }
            return {
                id: comp.id,
                name: comp.name,
                category: comp.category,
                type: comp.type,
                value: comp.value,
                amount: amount,
            };
        });

        const totalAdditions = componentResults
            .filter(c => c.category === 'ADDITION')
            .reduce((sum, c) => sum + c.amount, 0);

        const totalDeductions = componentResults
            .filter(c => c.category === 'DEDUCTION')
            .reduce((sum, c) => sum + c.amount, 0);

        // 8. Tax Deduction (Placeholder)
        const taxAmount = 0;

        // 9. Advance Recovery
        const advances = await this.prisma.salaryAdvance.findMany({
            where: {
                employeeId,
                remainingAmount: { gt: 0 },
                status: 'PAID',
            },
        });

        let totalAdvanceDeduction = 0;
        const advanceAdjustments: any[] = [];

        for (const advance of advances) {
            const schedule = (advance.deductionSchedule as any[]) || [];
            // Match installment within the period
            const periodInstallment = schedule.find(s => {
                const sStart = new Date(s.periodStartDate);
                return sStart.getTime() >= periodStart.getTime() &&
                    sStart.getTime() <= periodEnd.getTime() &&
                    !s.isDeducted;
            });

            if (periodInstallment) {
                totalAdvanceDeduction += periodInstallment.amount;
                advanceAdjustments.push({
                    advanceId: advance.id,
                    amount: periodInstallment.amount,
                });
            }
        }

        // 10. Final Calculation
        const netSalary = (basicSalary + totalAdditions + totalOtAmount) - (totalDeductions + totalNoPayAmount + taxAmount + totalAdvanceDeduction);

        return {
            employeeId,
            employeeName: employee.fullName,
            periodStartDate: periodStart,
            periodEndDate: periodEnd,
            basicSalary,
            otAmount: totalOtAmount,
            otBreakdown,
            noPayAmount: totalNoPayAmount,
            noPayBreakdown,
            taxAmount,
            components: componentResults,
            advanceDeduction: totalAdvanceDeduction,
            netSalary,
            advanceAdjustments,
        };
    }

    async bulkGenerate(companyId: string, periodStart: Date, periodEnd: Date, employeeIds?: string[]) {
        // If no employee IDs provided, get all active employees for company
        let targetEmployeeIds = employeeIds;
        if (!targetEmployeeIds || targetEmployeeIds.length === 0) {
            const employees = await this.prisma.employee.findMany({
                where: { companyId, status: 'ACTIVE' },
                select: { id: true },
            });
            targetEmployeeIds = employees.map(e => e.id);
        }

        const previews: any[] = [];
        for (const id of targetEmployeeIds) {
            try {
                const preview = await this.calculatePreview(companyId, periodStart, periodEnd, id);
                previews.push(preview);
            } catch (error) {
                console.error(`Error calculating salary for employee ${id}:`, error);
                // Continue to next employee
            }
        }

        return previews;
    }
}
