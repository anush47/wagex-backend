import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PoliciesService } from '../../policies/policies.service';
import { AttendanceProcessingService } from '../../attendance/services/attendance-processing.service';
import { AdvancesService } from '../../advances/advances.service';
import { GenerateSalaryDto } from '../dto/salary.dto';
import { PayCycleFrequency, PayrollCalculationMethod, OvertimeDayType, UnpaidLeaveAction } from '../../policies/dto/payroll-settings-policy.dto';
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
        const otDivisor = payrollConfig?.otDivisor || 200;
        const calculationMethod = payrollConfig?.calculationMethod || PayrollCalculationMethod.FIXED_MONTHLY_SALARY;
        
        const employeeBaseSalary = employee.basicSalary;
        let basicSalaryForPeriod = 0;
        const hourlyRate = employeeBaseSalary / otDivisor;
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
            const ot = this.calculateOvertime(session, hourlyRate, payrollConfig);
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
        if (calculationMethod === PayrollCalculationMethod.FIXED_MONTHLY_SALARY) {
            basicSalaryForPeriod = employeeBaseSalary;
            if (payrollConfig && payrollConfig.frequency !== PayCycleFrequency.MONTHLY) {
                const diffTime = Math.abs(periodEnd.getTime() - periodStart.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                basicSalaryForPeriod = dailyRate * diffDays;
            }
        } else if (calculationMethod === PayrollCalculationMethod.HOURLY_ATTENDANCE_WITH_OT) {
            const totalWorkMinutes = sessions.reduce((sum, s) => sum + (s.workMinutes || 0), 0);
            basicSalaryForPeriod = (totalWorkMinutes / 60) * hourlyRate;
        } else if (calculationMethod === PayrollCalculationMethod.DAILY_ATTENDANCE_FLAT) {
            let totalDays = 0;
            sessions.forEach(s => {
                if (s.workDayStatus === SessionWorkDayStatus.FULL) totalDays += 1;
                else if (s.workDayStatus === SessionWorkDayStatus.HALF_FIRST || s.workDayStatus === SessionWorkDayStatus.HALF_LAST) totalDays += 0.5;
                else if (s.workDayStatus === SessionWorkDayStatus.OFF && (s.workMinutes || 0) > 0) totalDays += 1;
            });
            basicSalaryForPeriod = totalDays * dailyRate;
        } else if (calculationMethod === PayrollCalculationMethod.SHIFT_ATTENDANCE_FLAT || calculationMethod === PayrollCalculationMethod.SHIFT_ATTENDANCE_WITH_OT) {
            basicSalaryForPeriod = sessions.length * dailyRate; // Assuming dailyRate acts as shiftRate
        }

        const otBreakdown = Object.entries(dynamicOtMap).map(([type, data]) => ({ type, ...data }));

        // 5.2 Calculate Late/Early Deduction
        let totalLateDeduction = 0;
        if (payrollConfig?.lateDeductionValue) {
            const totalLateMinutes = sessions.reduce((sum, s: any) => sum + (s.lateMinutes || 0) + (s.earlyLeaveMinutes || 0), 0);
            
            if (payrollConfig.lateDeductionType === 'DIVISOR_BASED') {
                // Calculation: (Basic / BaseRateDivisor / LateDeductionValue) * (TotalLateMinutes / 60)
                // LateDeductionValue is usually "Hours per working day" (e.g. 8)
                const minuteRate = (employeeBaseSalary / baseRateDivisor) / (payrollConfig.lateDeductionValue * 60);
                totalLateDeduction = totalLateMinutes * minuteRate;
            } else {
                // FIXED_AMOUNT (per minute probably?)
                totalLateDeduction = totalLateMinutes * payrollConfig.lateDeductionValue;
            }
        }

        // 6. Calculate No-Pay Breakdown
        // If autoDeductUnpaidLeaves is active, we check for missing days
        let totalNoPayAmount = 0;
        const noPayBreakdown = [
            { type: 'ABSENCE', count: 0, amount: 0 },
            { type: 'UNPAID_LEAVE', count: 0, amount: 0 },
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
            const dailyRate = employeeBaseSalary / baseRateDivisor;

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

                    if (dayConfig && dayConfig.type?.toString().toUpperCase() !== 'OFF') {
                        noPayBreakdown[0].count++;
                        noPayBreakdown[0].amount += dailyRate;
                        totalNoPayAmount += dailyRate;
                    }
                } else if (session.isOnLeave) {
                    // Check if this specific leave session is linked to an UNPAID leave type
                    const activeLeave = approvedLeaves.find(l => {
                        const lStart = new Date(l.startDate);
                        const lEnd = new Date(l.endDate);
                        const dDate = new Date(dayStr);
                        return dDate >= lStart && dDate <= lEnd;
                    });

                    if (activeLeave && unpaidLeaveTypeIds.includes(activeLeave.leaveTypeId)) {
                        noPayBreakdown[1].count++;
                        noPayBreakdown[1].amount += dailyRate;
                        totalNoPayAmount += dailyRate;
                    }
                }
            }

            // User Requirement: No-Pay deducts from basic salary directly if set to DEDUCT_FROM_TOTAL
            if (payrollConfig?.unpaidLeaveAction === UnpaidLeaveAction.DEDUCT_FROM_TOTAL) {
                basicSalaryForPeriod = Math.max(0, basicSalaryForPeriod - totalNoPayAmount);
            }
        }

        // 7. Salary Components (Additions / Deductions)
        // 7. Salary Components - Multi-Phase Processing
        const components = policy.salaryComponents?.components || [];

        // Phase 1: Separating Components
        const systemAdditions = components.filter(c => c.category === 'ADDITION' && c.systemType && c.systemType !== PayrollComponentSystemType.NONE);
        const standardAdditions = components.filter(c => c.category === 'ADDITION' && (!c.systemType || c.systemType === PayrollComponentSystemType.NONE));
        const systemDeductions = components.filter(c => c.category === 'DEDUCTION' && c.systemType && c.systemType !== PayrollComponentSystemType.NONE);
        const standardDeductions = components.filter(c => c.category === 'DEDUCTION' && (!c.systemType || c.systemType === PayrollComponentSystemType.NONE));

        let processedComponents: any[] = [];
        let currentTotalEarnings = basicSalaryForPeriod; // Start with resolved Basic for Period
        
        // If no-pay was already subtracted from basic and we want it to NOT affect total earnings (statutory base)
        // we add it back temporarily for calculation if noPayAffectsTotalEarnings is false
        if (payrollConfig?.autoDeductUnpaidLeaves && 
            payrollConfig?.unpaidLeaveAction === UnpaidLeaveAction.DEDUCT_FROM_TOTAL && 
            payrollConfig?.noPayAffectsTotalEarnings === false) {
            currentTotalEarnings += totalNoPayAmount;
        }

        // Conversely, if no-pay is NOT yet subtracted (it's a separate deduction component) 
        // but user WANTS it to affect total earnings, we subtract it here
        if (payrollConfig?.autoDeductUnpaidLeaves && 
            payrollConfig?.unpaidLeaveAction === UnpaidLeaveAction.ADD_AS_DEDUCTION && 
            payrollConfig?.noPayAffectsTotalEarnings !== false) {
            currentTotalEarnings -= totalNoPayAmount;
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

        // Phase 4: System Deductions (No-Pay)
        // If NO_PAY_DEDUCTION component exists, we use its value instead of generic `totalNoPayAmount` logic, or align them.
        let explicitNoPayDeduction = 0;
        systemDeductions.forEach(comp => {
            let amount = 0;
            if (comp.systemType === PayrollComponentSystemType.NO_PAY_DEDUCTION) {
                // Use the calculated no-pay amount from Step 6
                amount = totalNoPayAmount;
                explicitNoPayDeduction += amount;
            } else if (comp.systemType === PayrollComponentSystemType.EPF_EMPLOYEE) {
                // EPF is calculated on "Total Earnings for EPF" (Liable Earnings)
                // EPF Base usually = Basic + Statutory Additions
                // But simplified: use `currentTotalEarnings` (which includes basic + OT + flagged additions)
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

        // If we used a component for No-Pay, we shouldn't double deduct it via `totalNoPayAmount` variable in net calc.
        // If a NO_PAY component exists, we zero out the separate variable so it's only deducted via components.
        const hasNoPayComponent = processedComponents.some(c => c.systemType === PayrollComponentSystemType.NO_PAY_DEDUCTION);
        const finalNoPayDeductionForNet = hasNoPayComponent ? 0 : totalNoPayAmount;

        // However, standard logic line 196 uses `totalDeductions` (from components) + `totalNoPayAmount`.
        // So if component exists, it's inside `totalDeductions`. `totalNoPayAmount` should be 0.


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
        const netSalary = grossEarnings - (totalComponentDeductions + finalNoPayDeductionForNet + taxAmount + totalAdvanceDeduction + recAdj + totalLateDeduction + lateAdj);

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
