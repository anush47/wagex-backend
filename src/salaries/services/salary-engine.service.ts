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

@Injectable()
export class SalaryEngineService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly policiesService: PoliciesService,
        private readonly attendanceService: AttendanceProcessingService,
        private readonly advancesService: AdvancesService,
    ) { }

    private calculateOvertime(session: any, hourlyRate: number, payrollConfig: any) {
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
        let matchedRule: any = null;

        // Map session.workDayStatus (DB) to OvertimeDayType (Policy)
        let mappedStatus: OvertimeDayType = OvertimeDayType.ANY;
        if (session.workDayStatus === SessionWorkDayStatus.FULL) mappedStatus = OvertimeDayType.WORKING_DAY;
        else if (session.workDayStatus === SessionWorkDayStatus.HALF_FIRST || session.workDayStatus === SessionWorkDayStatus.HALF_LAST) mappedStatus = OvertimeDayType.HALF_DAY;
        else if (session.workDayStatus === SessionWorkDayStatus.OFF) mappedStatus = OvertimeDayType.OFF_DAY;

        if (otRules.length > 0) {
            for (const rule of otRules) {
                let statusMatch = rule.dayStatus === OvertimeDayType.ANY || rule.dayStatus === mappedStatus;
                
                let holidayMatch = true;
                if (rule.isHoliday !== undefined && rule.isHoliday !== null) {
                    const isSessionOnHoliday = !!(session.workHolidayId || session.payrollHolidayId);
                    if (rule.isHoliday !== isSessionOnHoliday) {
                        holidayMatch = false;
                    } else if (isSessionOnHoliday && rule.holidayTypes && rule.holidayTypes.length > 0) {
                        const holiday = session.payrollHoliday || session.workHoliday;
                        const holidayFlags: string[] = [];
                        if (holiday?.isPublic) holidayFlags.push('PUBLIC');
                        if (holiday?.isMercantile) holidayFlags.push('MERCANTILE');
                        if (holiday?.isBank) holidayFlags.push('BANK');
                        
                        // Check if ANY of the rule's required types match the holiday's flags
                        const typeMatch = rule.holidayTypes.some(t => holidayFlags.includes(t));
                        if (!typeMatch) holidayMatch = false;
                    }
                }

                if (statusMatch && holidayMatch) {
                    matchedRule = rule;
                    break;
                }
            }
        }

        if (matchedRule) {
            if (!matchedRule.otEnabled) {
                return { hours: 0, amount: 0, type: 'NONE' };
            }

            const eligibleMinutes = Math.max(0, session.workMinutes - matchedRule.startAfterMinutes);
            if (eligibleMinutes <= 0) {
                return { hours: 0, amount: 0, type: 'NONE' };
            }

            let totalOtAmount = 0;
            const sortedTiers = [...matchedRule.tiers].sort((a, b) => a.thresholdMinutes - b.thresholdMinutes);
            
            for (let i = 0; i < sortedTiers.length; i++) {
                const tier = sortedTiers[i];
                const nextTier = sortedTiers[i + 1];
                
                const tierStartInRule = tier.thresholdMinutes;
                const tierEndInRule = nextTier ? nextTier.thresholdMinutes : Infinity;
                
                // How much of the eligible OT falls into this tier window?
                const segmentStart = Math.max(0, tierStartInRule);
                const segmentEnd = Math.min(eligibleMinutes, tierEndInRule);
                
                if (segmentEnd > segmentStart) {
                    const segmentMinutes = segmentEnd - segmentStart;
                    totalOtAmount += (segmentMinutes / 60) * hourlyRate * tier.multiplier;
                }
            }

            return {
                hours: eligibleMinutes / 60,
                amount: totalOtAmount,
                type: matchedRule.name || 'RULE_BASED',
            };
        }

        // Legacy Fallback
        if (!session.overtimeMinutes || session.overtimeMinutes <= 0) {
            return { hours: 0, amount: 0, type: 'NONE' };
        }

        const hours = session.overtimeMinutes / 60;
        let rate = payrollConfig?.otNormalRate || 1.5;
        let type = 'NORMAL';

        if (session.workHolidayId) {
            rate = payrollConfig?.otTripleRate || 3.0;
            type = 'TRIPLE';
        } else if (new Date(session.date).getDay() === 0) { // Sunday
            rate = payrollConfig?.otDoubleRate || 2.0;
            type = 'DOUBLE';
        }

        return {
            hours,
            amount: hours * hourlyRate * rate,
            type,
        };
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

    async calculatePreview(companyId: string, periodStart: Date, periodEnd: Date, employeeId: string) {
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
                    gte: periodStart,
                    lte: periodEnd,
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

        // 5. Calculate OT Breakdown & Finalize Period Basic Salary
        let totalOtAmount = 0;
        const dynamicOtMap: Record<string, { hours: number, amount: number }> = {};

        sessions.forEach(session => {
            const ot = this.calculateOvertime(session, otHourlyRate, payrollConfig);
            if (ot.type !== 'NONE') {
                if (!dynamicOtMap[ot.type]) {
                    dynamicOtMap[ot.type] = { hours: 0, amount: 0 };
                }
                dynamicOtMap[ot.type].hours += ot.hours;
                dynamicOtMap[ot.type].amount += ot.amount;
                totalOtAmount += ot.amount;
            }
        });

        // 5.1 Calculate Period Basic Salary based on sessions and method
        // Frequency: Monthly -> Full Basic. Others -> Prorated by divisor.
        if (
            calculationMethod !== PayrollCalculationMethod.SHIFT_ATTENDANCE_FLAT || true // Simplified: all currently benefit from the same potential-based basic
        ) {
            if (payrollConfig?.frequency === PayCycleFrequency.MONTHLY) {
                basicSalaryForPeriod = employeeBaseSalary;
            } else {
                const diffTime = Math.abs(periodEnd.getTime() - periodStart.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                // "for other ones use the per day calculation based on the divisor"
                basicSalaryForPeriod = (employeeBaseSalary / baseRateDivisor) * diffDays;
            }
        }

        const otBreakdown = Object.entries(dynamicOtMap).map(([type, data]) => ({ type, ...data }));

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
                    { startDate: { gte: periodStart, lte: periodEnd } },
                    { endDate: { gte: periodStart, lte: periodEnd } },
                    { AND: [{ startDate: { lte: periodStart } }, { endDate: { gte: periodEnd } }] }
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

            for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
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

        // Phase 2: System Additions (e.g. Holiday Pay)
        // These often inject extra earnings based on attendance, affecting Total Earnings for EPF
        systemAdditions.forEach(comp => {
            let amount = 0;
            if (comp.systemType === PayrollComponentSystemType.HOLIDAY_PAY) {
                // Logic: Find sessions on holidays, calculate extra pay
                const holidayOt = otBreakdown.find(b => b.type === 'TRIPLE');
                if (holidayOt) {
                    amount = holidayOt.amount;
                }
                
                // ADD USER-REQUESTED ADJUSTMENT:
                // amount += holidayPayAdjustment (from previous draft if exists)
                // However, calculatePreview is often for NEW previews.
                // We should check if we have adjustment inputs passed in or if we should fetch existing.
            }

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
                amount = (currentTotalEarnings * comp.value) / 100;
                if (comp.employerValue !== undefined) {
                    (comp as any).employerAmount = (currentTotalEarnings * comp.employerValue) / 100;
                }
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

        // Phase 4.1: Inject Virtual System Deductions (Unpaid Leaves / Late)
        if (payrollConfig?.autoDeductUnpaidLeaves && totalUnpaidAmount > 0) {
            processedComponents.push({
                name: 'Unpaid Leave / LOP',
                category: 'DEDUCTION',
                type: 'FLAT_AMOUNT',
                amount: totalUnpaidAmount,
                systemType: PayrollComponentSystemType.NO_PAY_DEDUCTION,
                affectsTotalEarnings: payrollConfig.unpaidLeavesAffectTotalEarnings
            });
        }
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
        const problems = await this.validateEmployeePayroll(employeeId, periodStart, periodEnd, policy);

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
        };
    }

    async bulkGenerate(companyId: string, periodStart: Date, periodEnd: Date, employeeIds?: string[]) {
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
                const preview = await this.calculatePreview(companyId, periodStart, periodEnd, emp.id);
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
            payDate: new Date(), // Placeholder, usually set based on policy
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
