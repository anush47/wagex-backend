import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PoliciesService } from '../../policies/policies.service';
import { AttendanceProcessingService } from '../../attendance/services/attendance-processing.service';
import { AdvancesService } from '../../advances/advances.service';
import { GenerateSalaryDto } from '../dto/salary.dto';
import { PayCycleFrequency, PayrollCalculationMethod, OvertimeDayType } from '../../policies/dto/payroll-settings-policy.dto';
import { PayrollComponentType, PayrollComponentSystemType } from '../../policies/dto/salary-components-policy.dto';
import { SalaryStatus, LeaveStatus, ApprovalStatus, SessionWorkDayStatus } from '@prisma/client';
import { merge, groupBy } from 'lodash';
import { PolicySettingsDto } from '../../policies/dto/policy-settings.dto';
import { calculateOvertimeForSession, calculatePolicyOvertimeMinutes, OvertimeResult } from '../../attendance/utils/overtime-calculator';

@Injectable()
export class SalaryEngineService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly policiesService: PoliciesService,
        private readonly attendanceService: AttendanceProcessingService,
        private readonly advancesService: AdvancesService,
    ) { }

    private calculateOvertime(session: any, hourlyRate: number, payrollConfig: any): OvertimeResult {
        if (!session.workMinutes || session.workMinutes <= 0) {
            return { hours: 0, amount: 0, type: 'NONE' };
        }

        const calculationMethod = payrollConfig?.calculationMethod || PayrollCalculationMethod.FIXED_MONTHLY_SALARY;
        if (
            calculationMethod === PayrollCalculationMethod.SHIFT_ATTENDANCE_FLAT ||
            calculationMethod === PayrollCalculationMethod.DAILY_ATTENDANCE_FLAT
        ) {
            return { hours: 0, amount: 0, type: 'NONE' };
        }

        const otRules = (payrollConfig?.otRules as any[]) || [];

        // Check if session is on a holiday
        const isSessionOnHoliday = !!(session.workHolidayId || session.payrollHolidayId);
        const holiday = session.payrollHoliday || session.workHoliday;
        const holidayFlags: string[] = [];
        if (isSessionOnHoliday && holiday) {
            if (holiday.isPublic) holidayFlags.push('PUBLIC');
            if (holiday.isMercantile) holidayFlags.push('MERCANTILE');
            if (holiday.isBank) holidayFlags.push('BANK');
        }

        // Use centralized OT calculator
        const otResult = calculateOvertimeForSession(
            session.workMinutes,
            session.workDayStatus,
            isSessionOnHoliday,
            holidayFlags,
            hourlyRate,
            otRules
        );

        return otResult;
    }

    private async validateEmployeePayroll(employeeId: string, periodStart: Date, periodEnd: Date, policy: PolicySettingsDto) {
        const warnings: string[] = [];
        const problems: any[] = [];

        // 1. Check for Pending Leaves
        const pendingLeaves = await this.prisma.leaveRequest.findMany({
            where: {
                employeeId,
                status: LeaveStatus.PENDING,
                OR: [
                    { startDate: { gte: periodStart, lte: periodEnd } },
                    { endDate: { gte: periodStart, lte: periodEnd } },
                ],
            },
        });

        if (pendingLeaves.length > 0) {
            problems.push({
                type: 'PENDING_LEAVE',
                severity: 'ERROR',
                message: `Found ${pendingLeaves.length} pending leave requests in this period.`,
                count: pendingLeaves.length,
            });
        }

        // 2. Check for Unapproved Attendance Sessions
        const unapprovedSessions = await this.prisma.attendanceSession.findMany({
            where: {
                employeeId,
                date: { gte: periodStart, lte: periodEnd },
                OR: [
                    { inApprovalStatus: ApprovalStatus.PENDING },
                    { outApprovalStatus: ApprovalStatus.PENDING },
                ],
            },
        });

        if (unapprovedSessions.length > 0) {
            problems.push({
                type: 'UNAPPROVED_ATTENDANCE',
                severity: 'ERROR',
                message: `Found ${unapprovedSessions.length} sessions requiring approval.`,
                count: unapprovedSessions.length,
            });
        }

        // 3. Check for Unclosed Sessions (No Check-out)
        const unclosedSessions = await this.prisma.attendanceSession.findMany({
            where: {
                employeeId,
                date: { gte: periodStart, lte: periodEnd },
                checkInTime: { not: null },
                checkOutTime: null,
                isOnLeave: false,
            },
        });

        if (unclosedSessions.length > 0) {
            const datesStr = unclosedSessions.map(s => s.date.toISOString().split('T')[0]).join(', ');
            problems.push({
                type: 'UNCLOSED_SESSION',
                severity: 'ERROR',
                message: `Found ${unclosedSessions.length} unclosed sessions (missing check-out) on: ${datesStr}`,
                count: unclosedSessions.length,
            });
        }

        // 4. Check for Missing Attendance on Working Days (No Session AND No Approved Leave)
        const sessions = await this.prisma.attendanceSession.findMany({
            where: { employeeId, date: { gte: periodStart, lte: periodEnd } },
            select: { date: true, isOnLeave: true, isHalfDay: true },
        });

        const approvedLeaves = await this.prisma.leaveRequest.findMany({
            where: {
                employeeId,
                status: LeaveStatus.APPROVED,
                OR: [
                    { startDate: { gte: periodStart, lte: periodEnd } },
                    { endDate: { gte: periodStart, lte: periodEnd } },
                    { AND: [{ startDate: { lte: periodStart } }, { endDate: { gte: periodEnd } }] }
                ],
            },
        });

        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
            const dayStr = d.toISOString().split('T')[0];
            const hasSession = sessions.some(s => s.date.toISOString().split('T')[0] === dayStr);
            const hasApprovedLeave = approvedLeaves.some(l => {
                const lStart = new Date(l.startDate);
                const lEnd = new Date(l.endDate);
                const dDate = new Date(dayStr);
                return dDate >= lStart && dDate <= lEnd;
            });

            const dayName = dayNames[d.getDay()];
            const dayConfig = (policy.workingDays?.defaultPattern as any)?.[dayName];

            // Only flag if it's a working day (NOT OFF)
            if (!hasSession && !hasApprovedLeave && dayConfig && dayConfig.type?.toString().toUpperCase() !== 'OFF') {
                problems.push({
                    type: 'MISSING_ATTENDANCE',
                    severity: 'WARNING',
                    message: `No attendance log or approved leave found for working day: ${dayStr}`,
                    date: dayStr,
                });
            }
        }

        return problems;
    }

    async calculatePreview(
        companyId: string, 
        periodStart: Date, 
        periodEnd: Date, 
        employeeId: string,
        attendanceStart?: Date,
        attendanceEnd?: Date,
        payDate?: Date
    ) {
        // Use attendance period if provided, otherwise fallback to salary period
        const aStart = attendanceStart || periodStart;
        const aEnd = attendanceEnd || periodEnd;

        // 1. Get Effective Policy
        const policy = await this.policiesService.getEffectivePolicy(employeeId);

        // 2. Fetch Employee Data
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
        });
        if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

        // 3. Resolve Basic Salary for Period based on Calculation Method
        const payrollConfig = policy.payrollConfiguration;
        const baseRateDivisor = payrollConfig?.baseRateDivisor || 30;
        const calculationMethod = payrollConfig?.calculationMethod || PayrollCalculationMethod.FIXED_MONTHLY_SALARY;
        
        const employeeBaseSalary = employee.basicSalary;
        let basicSalaryForPeriod = 0;
        
        // OT Hourly Rate Calculation: (Base / baseRateDivisor) / otHourlyValue OR fixed amount
        let otHourlyRate = 0;
        const othValue = (payrollConfig as any)?.otHourlyValue || 8;
        if ((payrollConfig as any)?.otHourlyType === 'FIXED_AMOUNT') {
            otHourlyRate = othValue;
        } else {
            otHourlyRate = (employeeBaseSalary / baseRateDivisor) / othValue;
        }

        const dailyRate = employeeBaseSalary / baseRateDivisor;

        // 4. Fetch Attendance Data for Period
        const sessions = await this.prisma.attendanceSession.findMany({
            where: {
                employeeId,
                date: {
                    gte: aStart,
                    lte: aEnd,
                },
                OR: [
                    { salaryId: null },
                    {
                        salary: {
                            periodStartDate: periodStart,
                            periodEndDate: periodEnd,
                            status: SalaryStatus.DRAFT
                        }
                    }
                ]
            },
            include: {
                payrollHoliday: true,
                workHoliday: true,
            }
        });

        // 5. Calculate OT Breakdown & Holiday Pay Breakdown
        // Rules with affectTotalEarnings=true go to Holiday Pay, others go to regular OT
        let totalOtAmount = 0;
        let totalHolidayPayAmount = 0;
        const dynamicOtMap: Record<string, { hours: number, amount: number, type: string }> = {};
        const holidayPayMap: Record<string, { hours: number, amount: number, holidayName: string, affectTotalEarnings: boolean }> = {};
        const otRules = policy.payrollConfiguration?.otRules || [];

        sessions.forEach(session => {
            const ot = this.calculateOvertime(session, otHourlyRate, payrollConfig);
            if (ot.type !== 'NONE' && ot.matchedRule) {
                // Check if this OT should go to Holiday Pay (affectTotalEarnings = true)
                const goesToHolidayPay = ot.matchedRule.affectTotalEarnings !== false;

                if (goesToHolidayPay) {
                    // Add to Holiday Pay breakdown
                    const holidayName = ot.matchedRule.isHoliday
                        ? (session.payrollHoliday || session.workHoliday)?.name || 'Holiday OT'
                        : 'Off Day OT';
                    const holidayKey = `${ot.matchedRule.id || 'holiday'}-${session.date}`;

                    if (!holidayPayMap[holidayKey]) {
                        holidayPayMap[holidayKey] = {
                            hours: 0,
                            amount: 0,
                            holidayName,
                            affectTotalEarnings: true
                        };
                    }
                    holidayPayMap[holidayKey].hours += ot.hours;
                    holidayPayMap[holidayKey].amount += ot.amount;
                    totalHolidayPayAmount += ot.amount;
                } else {
                    // Add to regular OT breakdown
                    if (!dynamicOtMap[ot.type]) {
                        dynamicOtMap[ot.type] = { hours: 0, amount: 0, type: ot.type };
                    }
                    dynamicOtMap[ot.type].hours += ot.hours;
                    dynamicOtMap[ot.type].amount += ot.amount;
                    totalOtAmount += ot.amount;
                }
            }
        });

        const otBreakdown = Object.entries(dynamicOtMap).map(([_, data]) => ({ type: data.type, hours: data.hours, amount: data.amount }));
        const holidayPayBreakdown = Object.values(holidayPayMap);

        // 5.1 Calculate Period Basic Salary based on sessions and method
        // Frequency: Monthly -> Full Basic. Others -> Prorated by divisor.
        if (
            calculationMethod !== PayrollCalculationMethod.SHIFT_ATTENDANCE_FLAT
        ) {
            if (payrollConfig?.frequency === PayCycleFrequency.MONTHLY) {
                basicSalaryForPeriod = employeeBaseSalary;
            } else {
                const diffTime = Math.abs(periodEnd.getTime() - periodStart.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                basicSalaryForPeriod = (employeeBaseSalary / baseRateDivisor) * diffDays;
            }
        }

        // 5.2 Calculate Late/Early Deduction
        let totalLateDeduction = 0;
        let totalLateMinutes = 0;
        if (payrollConfig?.lateDeductionValue) {
            totalLateMinutes = sessions.reduce((sum, s: any) => {
                const sessionLate = (s.lateMinutes || 0) + (s.earlyLeaveMinutes || 0);
                const grace = (payrollConfig as any).lateDeductionGraceMinutes || 0;
                // If late is within grace, don't count it for deduction
                return sum + (sessionLate > grace ? sessionLate : 0);
            }, 0);
            
            if (payrollConfig.lateDeductionType === 'DIVISOR_BASED') {
                const lateHourlyRate = (employeeBaseSalary / baseRateDivisor) / (payrollConfig.lateDeductionValue || 8);
                const minuteRate = lateHourlyRate / 60;
                totalLateDeduction = totalLateMinutes * minuteRate;
            } else {
                totalLateDeduction = (totalLateMinutes / 60) * payrollConfig.lateDeductionValue;
            }
        }

        // 6. Calculate No-Pay Breakdown
        let totalUnpaidAmount = 0;
        let unpaidCount = 0;
        let absenceCount = 0;
        let absenceAmount = 0;

        const unpaidBreakdown = [
            { type: 'ABSENCE', count: 0, amount: 0, reason: 'Absence without leave' },
            { type: 'UNPAID_LEAVE', count: 0, amount: 0, reason: 'Approved unpaid leave' },
        ];

        const approvedLeaves = await this.prisma.leaveRequest.findMany({
            where: {
                employeeId,
                status: LeaveStatus.APPROVED,
                OR: [
                    { startDate: { gte: aStart, lte: aEnd } },
                    { endDate: { gte: aStart, lte: aEnd } },
                    { AND: [{ startDate: { lte: aStart } }, { endDate: { gte: aEnd } }] }
                ],
            },
        });

        const unpaidLeaveTypeIds = (policy.leaves?.leaveTypes || [])
            .filter((lt: any) => lt.isPaid === false)
            .map((lt: any) => lt.id);

        if (payrollConfig?.autoDeductUnpaidLeaves) {
            const config = payrollConfig as any;
            const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

            const calculateNoPayDeduction = (type: any, value: number) => {
                if (type === 'DIVISOR_BASED') {
                    return value * dailyRate;
                }
                return value; // FIXED_AMOUNT
            };

            for (let d = new Date(aStart); d <= aEnd; d.setDate(d.getDate() + 1)) {
                const dayStr = d.toISOString().split('T')[0];
                const session = sessions.find(s => s.date.toISOString().split('T')[0] === dayStr);

                if (!session) {
                    const dayName = dayNames[d.getDay()];
                    const dayConfig = (policy.workingDays?.defaultPattern as any)?.[dayName];

                    if (dayConfig && dayConfig.type?.toString().toUpperCase() !== 'OFF') {
                        unpaidBreakdown[0].count++;
                        const amt = calculateNoPayDeduction(config.unpaidLeaveFullDayType, config.unpaidLeaveFullDayValue || 1);
                        unpaidBreakdown[0].amount += amt;
                        totalUnpaidAmount += amt;
                    }
                } else if (session.isOnLeave) {
                    const activeLeave = approvedLeaves.find(l => {
                        const lStart = new Date(l.startDate);
                        const lEnd = new Date(l.endDate);
                        const dDate = new Date(dayStr);
                        return dDate >= lStart && dDate <= lEnd;
                    });

                    if (activeLeave && unpaidLeaveTypeIds.includes(activeLeave.leaveTypeId)) {
                        unpaidBreakdown[1].count++;
                        const isHalfDay = (activeLeave as any).isHalfDay || session.isHalfDay;
                        const amt = isHalfDay
                            ? calculateNoPayDeduction(config.unpaidLeaveHalfDayType, config.unpaidLeaveHalfDayValue || 0.5)
                            : calculateNoPayDeduction(config.unpaidLeaveFullDayType, config.unpaidLeaveFullDayValue || 1);
                            
                        unpaidBreakdown[1].amount += amt;
                        totalUnpaidAmount += amt;
                    }
                } else if (session.isHalfDay) {
                    const hasLeave = approvedLeaves.some(l => {
                        const lStart = new Date(l.startDate);
                        const lEnd = new Date(l.endDate);
                        const dDate = new Date(dayStr);
                        return dDate >= lStart && dDate <= lEnd;
                    });

                    if (!hasLeave) {
                        unpaidBreakdown[0].count += 0.5;
                        const amt = calculateNoPayDeduction(config.unpaidLeaveHalfDayType, config.unpaidLeaveHalfDayValue || 0.5);
                        unpaidBreakdown[0].amount += amt;
                        totalUnpaidAmount += amt;
                    }
                }
            }
        }

        // Consolidated No-Pay Breakdown for display
        const totalNoPayAmount = totalUnpaidAmount + (payrollConfig?.autoDeductLate ? totalLateDeduction : 0);
        const noPayBreakdown = [...unpaidBreakdown];
        if (payrollConfig?.autoDeductLate) {
            noPayBreakdown.push({ type: 'LATE', count: totalLateMinutes, amount: totalLateDeduction, reason: `Late arrivals / Early leaves (+${totalLateMinutes}m)` });
        }

        // 6.1 Note: User requirement - Deductions are always added as line items, never reducing basic directly.
        // So we do NOT modify basicSalaryForPeriod here anymore.
        
        // 7. Salary Components - Multi-Phase Processing
        const components = policy.salaryComponents?.components || [];

        // Phase 1: Separating Components
        const systemAdditions = components.filter(c => c.category === 'ADDITION' && c.systemType && c.systemType !== PayrollComponentSystemType.NONE);
        const standardAdditions = components.filter(c => c.category === 'ADDITION' && (!c.systemType || c.systemType === PayrollComponentSystemType.NONE));
        const systemDeductions = components.filter(c => c.category === 'DEDUCTION' && c.systemType && c.systemType !== PayrollComponentSystemType.NONE);
        const standardDeductions = components.filter(c => c.category === 'DEDUCTION' && (!c.systemType || c.systemType === PayrollComponentSystemType.NONE));

        let processedComponents: any[] = [];
        let currentTotalEarnings = basicSalaryForPeriod; // Start with resolved Basic for Period
        
        // Adjust for Statutory Base (EPF/ETF) using specific toggles
        if (payrollConfig?.autoDeductUnpaidLeaves && payrollConfig?.unpaidLeavesAffectTotalEarnings) {
            currentTotalEarnings -= totalUnpaidAmount;
        }

        if (payrollConfig?.autoDeductLate && payrollConfig?.lateDeductionsAffectTotalEarnings) {
            currentTotalEarnings -= totalLateDeduction;
        }

        // Phase 2: System Additions (excluding Holiday Pay which is calculated separately)
        // These often inject extra earnings based on attendance, affecting Total Earnings for EPF
        systemAdditions.forEach(comp => {
            // Skip HOLIDAY_PAY as it's now calculated separately from attendance sessions
            if (comp.systemType === PayrollComponentSystemType.HOLIDAY_PAY) {
                return;
            }
            
            let amount = 0;

            processedComponents.push({
                ...comp,
                amount
            });

            if (comp.affectsTotalEarnings) {
                currentTotalEarnings += amount;
            }
        });

        // Phase 3: Standard Additions
        // Fixed amounts or % of Basic
        standardAdditions.forEach(comp => {
            let amount = 0;
            if (comp.type === PayrollComponentType.FLAT_AMOUNT) {
                amount = comp.value;
            } else if (comp.type === PayrollComponentType.PERCENTAGE_BASIC) {
                amount = (basicSalaryForPeriod * comp.value) / 100;
            }

            processedComponents.push({
                ...comp,
                amount
            });

            if (comp.affectsTotalEarnings) {
                currentTotalEarnings += amount;
            }
        });

        // Phase 3.1: Add Holiday Pay as a component (includes OT from rules with affectTotalEarnings=true)
        // This includes Off Day OT and Holiday OT that affect statutory base
        if (totalHolidayPayAmount > 0) {
            processedComponents.push({
                id: 'holiday-pay',
                name: 'Holiday Pay',
                category: 'ADDITION',
                type: 'FLAT_AMOUNT',
                amount: totalHolidayPayAmount,
                systemType: PayrollComponentSystemType.HOLIDAY_PAY,
                affectsTotalEarnings: true,
                isStatutory: true,
                breakdown: holidayPayBreakdown
            });

            // Holiday pay always affects total earnings (that's why it's in this category)
            currentTotalEarnings += totalHolidayPayAmount;
        }

        // Phase 3.2: Add regular OT as a component (does NOT affect total earnings)
        if (totalOtAmount > 0) {
            processedComponents.push({
                id: 'ot-pay',
                name: 'Overtime Pay',
                category: 'ADDITION',
                type: 'FLAT_AMOUNT',
                amount: totalOtAmount,
                systemType: PayrollComponentSystemType.NONE,
                affectsTotalEarnings: false,
                isStatutory: false,
                breakdown: otBreakdown
            });

            // Regular OT does NOT affect total earnings for EPF/ETF
        }

        // Phase 4: System Deductions (EPF, ETF)
        // Note: No-Pay and Late are now injected manually at the end or processed if they still exist in policy
        systemDeductions.forEach(comp => {
            let amount = 0;
            if (comp.systemType === PayrollComponentSystemType.NO_PAY_DEDUCTION || comp.systemType === PayrollComponentSystemType.LATE_DEDUCTION) {
                // Skip policy-defined no-pay/late components as they are handled natively now
                return;
            } else if (comp.systemType === PayrollComponentSystemType.EPF_EMPLOYEE) {
                // EPF is calculated on "Total Earnings for EPF" (Liable Earnings)
                amount = (currentTotalEarnings * comp.value) / 100;
                if (comp.employerValue !== undefined) {
                    (comp as any).employerAmount = (currentTotalEarnings * comp.employerValue) / 100;
                }
            } else if (comp.systemType === PayrollComponentSystemType.ETF_EMPLOYER) {
                // ETF is employer-only contribution, use employerValue for calculation
                amount = (currentTotalEarnings * (comp.employerValue || 0)) / 100;
                (comp as any).employerAmount = amount;
            }

            processedComponents.push({
                ...comp,
                amount,
                employerAmount: (comp as any).employerAmount
            });
        });

        // Phase 5: Standard Deductions (including those dependent on Total Earnings)
        standardDeductions.forEach(comp => {
            let amount = 0;
            if (comp.type === PayrollComponentType.FLAT_AMOUNT) {
                amount = comp.value;
            } else if (comp.type === PayrollComponentType.PERCENTAGE_BASIC) {
                amount = (basicSalaryForPeriod * comp.value) / 100;
            } else if (comp.type === PayrollComponentType.PERCENTAGE_TOTAL_EARNINGS) {
                amount = (currentTotalEarnings * comp.value) / 100;
            }

            processedComponents.push({
                ...comp,
                amount
            });
        });

        // Phase 4.1: Inject Virtual System Deductions (Late only, No-Pay is handled separately)
        // Note: We do NOT add Unpaid Leave / LOP as a component since it's already 
        // tracked separately in noPayAmount and noPayBreakdown fields
        if (payrollConfig?.autoDeductLate && totalLateDeduction > 0) {
            processedComponents.push({
                name: 'Late Arrival Deduction',
                category: 'DEDUCTION',
                type: 'FLAT_AMOUNT',
                amount: totalLateDeduction,
                systemType: PayrollComponentSystemType.LATE_DEDUCTION,
                affectsTotalEarnings: payrollConfig.lateDeductionsAffectTotalEarnings
            });
        }

        // Summarize
        const totalAdditions = processedComponents
            .filter(c => c.category === 'ADDITION')
            .reduce((sum, c) => sum + c.amount, 0);

        const totalComponentDeductions = processedComponents
            .filter(c => c.category === 'DEDUCTION')
            .reduce((sum, c) => sum + c.amount, 0);

        const epfEmployerAmount = processedComponents
            .filter(c => c.systemType === PayrollComponentSystemType.EPF_EMPLOYEE)
            .reduce((sum, c) => sum + (c.employerAmount || 0), 0);

        const etfEmployerAmount = processedComponents
            .filter(c => c.systemType === PayrollComponentSystemType.ETF_EMPLOYER)
            .reduce((sum, c) => sum + (c.employerAmount || 0), 0);

        // All deductions are now processed as components (virtual or standard)
        const finalNoPayDeductionForNet = 0;
        const finalLateDeductionForNet = 0;


        // 8. Tax Deduction (Placeholder)
        const taxAmount = 0;

        // 9. Advance Recovery
        const advanceAdjustments = await this.advancesService.getActiveDeductions(employeeId, periodStart, periodEnd);
        const totalAdvanceDeduction = advanceAdjustments.reduce((sum, adj) => sum + adj.amount, 0);

        // 10. Final Calculation
        // Net Salary = Earnings - NoPay - ComponentDeductions - Tax - AdvanceRecoveries
        // user requirement: Holiday pay + adjustments should affect total earnings (statutory base)
        const holidayPayComp = processedComponents.find(c => c.systemType === PayrollComponentSystemType.HOLIDAY_PAY);
        const holidayPayAmount = holidayPayComp ? holidayPayComp.amount : 0;
        
        // Final statutory base (Tot. Earn.) adjustment if needed
        // For existing drafts, we fetch the adjustments from DB if not provided
        const existingSalary = await this.prisma.salary.findUnique({
            where: { employeeId_periodStartDate_periodEndDate: { employeeId, periodStartDate: periodStart, periodEndDate: periodEnd } }
        });
        
        const hPayAdjustment = existingSalary?.holidayPayAdjustment || 0;
        const otAdj = existingSalary?.otAdjustment || 0;
        const recAdj = existingSalary?.recoveryAdjustment || 0;
        const lateAdj = existingSalary?.lateAdjustment || 0;

        // Add holiday pay adjustment to the statutory base
        currentTotalEarnings += hPayAdjustment;

        const grossEarnings = basicSalaryForPeriod + totalAdditions + totalOtAmount + otAdj + hPayAdjustment;
        const netSalary = grossEarnings - (totalComponentDeductions + finalNoPayDeductionForNet + taxAmount + totalAdvanceDeduction + recAdj + finalLateDeductionForNet + lateAdj);

        // 11. Run Validations
        const problems = await this.validateEmployeePayroll(employeeId, aStart, aEnd, policy);

        return {
            employeeId,
            employeeName: employee.fullName,
            employeeNo: employee.employeeNo,
            policyName: (policy as any).name || 'Default',
            periodStartDate: periodStart,
            periodEndDate: periodEnd,
            basicSalary: basicSalaryForPeriod,
            otAmount: totalOtAmount,
            otBreakdown,
            holidayPayAmount: totalHolidayPayAmount,
            holidayPayBreakdown,
            lateDeduction: totalLateDeduction,
            lateAdjustment: lateAdj,
            noPayAmount: totalNoPayAmount,
            noPayBreakdown,
            taxAmount,
            components: processedComponents,
            advanceDeduction: totalAdvanceDeduction,
            netSalary,
            advanceAdjustments,
            sessionIds: sessions.map(s => s.id),
            sessions: sessions, // For preview display
            problems,
            hasProblems: problems.length > 0,
            holidayPayAdjustment: hPayAdjustment,
            holidayPayAdjustmentReason: existingSalary?.holidayPayAdjustmentReason,
            otAdjustment: otAdj,
            otAdjustmentReason: existingSalary?.otAdjustmentReason,
            recoveryAdjustment: recAdj,
            recoveryAdjustmentReason: existingSalary?.recoveryAdjustmentReason,
            attendanceStartDate: aStart,
            attendanceEndDate: aEnd,
            payDate: payDate || periodEnd,
        };
    }

    async bulkGenerate(companyId: string, periodStart: Date, periodEnd: Date, employeeIds?: string[], attendanceStart?: Date, attendanceEnd?: Date, payDate?: Date) {
        let targetEmployees: any[] = [];
        if (!employeeIds || employeeIds.length === 0) {
            targetEmployees = await this.prisma.employee.findMany({
                where: { companyId, status: 'ACTIVE' },
                include: { policy: true },
            });
        } else {
            targetEmployees = await this.prisma.employee.findMany({
                where: { id: { in: employeeIds } },
                include: { policy: true },
            });
        }

        const previews: any[] = [];
        for (const emp of targetEmployees) {
            try {
                const preview = await this.calculatePreview(companyId, periodStart, periodEnd, emp.id, attendanceStart, attendanceEnd, payDate);
                previews.push({
                    ...preview,
                    policyId: emp.policyId || 'DEFAULT',
                });
            } catch (error) {
                console.error(`Error calculating salary for employee ${emp.id}:`, error);
            }
        }

        // Group by policy for a cleaner UI view
        const grouped = groupBy(previews, 'policyId');
        return Object.entries(grouped).map(([policyId, items]) => ({
            policyId,
            policyName: items[0].policyName,
            employees: items,
            totalNet: items.reduce((sum, i) => sum + i.netSalary, 0),
            problemCount: items.filter(i => i.hasProblems).length,
        }));
    }

    async saveDrafts(companyId: string, previews: any[]) {
        const salaryRecords = previews.flatMap(p => p.employees).map(p => ({
            employeeId: p.employeeId,
            companyId,
            periodStartDate: p.periodStartDate,
            periodEndDate: p.periodEndDate,
            payDate: p.payDate || new Date(), 
            basicSalary: p.basicSalary,
            otAmount: p.otAmount,
            otBreakdown: p.otBreakdown as any,
            noPayAmount: p.noPayAmount,
            noPayBreakdown: p.noPayBreakdown as any,
            taxAmount: p.taxAmount,
            components: p.components as any,
            advanceDeduction: p.advanceDeduction,
            advanceAdjustments: p.advanceAdjustments || [],
            netSalary: p.netSalary,
            status: SalaryStatus.DRAFT,
            holidayPayAdjustment: p.holidayPayAdjustment || 0,
            holidayPayAdjustmentReason: p.holidayPayAdjustmentReason || "",
            otAdjustment: p.otAdjustment || 0,
            otAdjustmentReason: p.otAdjustmentReason || "",
            recoveryAdjustment: p.recoveryAdjustment || 0,
            recoveryAdjustmentReason: p.recoveryAdjustmentReason || "",
        }));

        // We use upsert for performance and to handle existing drafts
        for (const salary of salaryRecords) {
            await this.prisma.salary.upsert({
                where: {
                    employeeId_periodStartDate_periodEndDate: {
                        employeeId: (salary as any).employeeId,
                        periodStartDate: (salary as any).periodStartDate,
                        periodEndDate: (salary as any).periodEndDate,
                    }
                },
                update: salary as any,
                create: salary as any,
            });
        }

        return { count: salaryRecords.length };
    }
}
