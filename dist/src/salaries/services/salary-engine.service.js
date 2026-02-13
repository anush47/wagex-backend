"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalaryEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const policies_service_1 = require("../../policies/policies.service");
const attendance_processing_service_1 = require("../../attendance/services/attendance-processing.service");
const payroll_settings_policy_dto_1 = require("../../policies/dto/payroll-settings-policy.dto");
const salary_components_policy_dto_1 = require("../../policies/dto/salary-components-policy.dto");
let SalaryEngineService = class SalaryEngineService {
    prisma;
    policiesService;
    attendanceService;
    constructor(prisma, policiesService, attendanceService) {
        this.prisma = prisma;
        this.policiesService = policiesService;
        this.attendanceService = attendanceService;
    }
    async calculatePreview(companyId, periodStart, periodEnd, employeeId) {
        const policy = await this.policiesService.getEffectivePolicy(employeeId);
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
        });
        if (!employee)
            throw new common_1.NotFoundException(`Employee ${employeeId} not found`);
        const payrollConfig = policy.payrollConfiguration;
        const baseRateDivisor = payrollConfig?.baseRateDivisor || 30;
        let basicSalary = employee.basicSalary;
        if (payrollConfig && payrollConfig.frequency !== payroll_settings_policy_dto_1.PayCycleFrequency.MONTHLY) {
            const dailyRate = basicSalary / baseRateDivisor;
            const diffTime = Math.abs(periodEnd.getTime() - periodStart.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            basicSalary = dailyRate * diffDays;
        }
        const hourlyRate = basicSalary / (payrollConfig?.otDivisor || 200);
        const sessions = await this.prisma.attendanceSession.findMany({
            where: {
                employeeId,
                date: {
                    gte: periodStart,
                    lte: periodEnd,
                },
            },
        });
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
                let typeIdx = 0;
                if (session.workHolidayId) {
                    rate = payrollConfig?.otTripleRate || 3.0;
                    typeIdx = 2;
                }
                else if (new Date(session.date).getDay() === 0) {
                    rate = payrollConfig?.otDoubleRate || 2.0;
                    typeIdx = 1;
                }
                const amount = hours * hourlyRate * rate;
                otBreakdown[typeIdx].hours += hours;
                otBreakdown[typeIdx].amount += amount;
                totalOtAmount += amount;
            }
        });
        let totalNoPayAmount = 0;
        const noPayBreakdown = [
            { type: 'ABSENCE', count: 0, amount: 0 },
            { type: 'UNPAID_LEAVE', count: 0, amount: 0 },
        ];
        if (payrollConfig?.autoDeductUnpaidLeaves) {
            const dailyRate = basicSalary / baseRateDivisor;
            const diffTime = Math.abs(periodEnd.getTime() - periodStart.getTime());
            const totalDaysInPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            const presentDays = sessions.length;
            const leaveSessions = sessions.filter(s => s.isOnLeave || s.isHalfDay);
            for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
                const dayStr = d.toISOString().split('T')[0];
                const session = sessions.find(s => s.date.toISOString().split('T')[0] === dayStr);
                if (!session) {
                    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
                    const dayName = dayNames[d.getDay()];
                    const dayConfig = policy.workingDays?.defaultPattern?.[dayName];
                    if (dayConfig && dayConfig.type !== 'OFF') {
                        noPayBreakdown[0].count++;
                        noPayBreakdown[0].amount += dailyRate;
                        totalNoPayAmount += dailyRate;
                    }
                }
                else if (session.isOnLeave) {
                }
            }
        }
        const components = policy.salaryComponents?.components || [];
        const componentResults = components.map(comp => {
            let amount = 0;
            if (comp.type === salary_components_policy_dto_1.PayrollComponentType.FLAT_AMOUNT) {
                amount = comp.value;
            }
            else if (comp.type === salary_components_policy_dto_1.PayrollComponentType.PERCENTAGE_BASIC) {
                amount = (basicSalary * comp.value) / 100;
            }
            else if (comp.type === salary_components_policy_dto_1.PayrollComponentType.PERCENTAGE_GROSS) {
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
        const taxAmount = 0;
        const advances = await this.prisma.salaryAdvance.findMany({
            where: {
                employeeId,
                remainingAmount: { gt: 0 },
                status: 'PAID',
            },
        });
        let totalAdvanceDeduction = 0;
        const advanceAdjustments = [];
        for (const advance of advances) {
            const schedule = advance.deductionSchedule || [];
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
    async bulkGenerate(companyId, periodStart, periodEnd, employeeIds) {
        let targetEmployeeIds = employeeIds;
        if (!targetEmployeeIds || targetEmployeeIds.length === 0) {
            const employees = await this.prisma.employee.findMany({
                where: { companyId, status: 'ACTIVE' },
                select: { id: true },
            });
            targetEmployeeIds = employees.map(e => e.id);
        }
        const previews = [];
        for (const id of targetEmployeeIds) {
            try {
                const preview = await this.calculatePreview(companyId, periodStart, periodEnd, id);
                previews.push(preview);
            }
            catch (error) {
                console.error(`Error calculating salary for employee ${id}:`, error);
            }
        }
        return previews;
    }
};
exports.SalaryEngineService = SalaryEngineService;
exports.SalaryEngineService = SalaryEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        policies_service_1.PoliciesService,
        attendance_processing_service_1.AttendanceProcessingService])
], SalaryEngineService);
//# sourceMappingURL=salary-engine.service.js.map