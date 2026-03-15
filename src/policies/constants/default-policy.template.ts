import { PolicySettingsDto } from '../dto/policy-settings.dto';
import { PayCycleFrequency, PayrollCalculationMethod, LateDeductionType, OvertimeCalculationMethod, OvertimeDayType } from '../dto/payroll-settings-policy.dto';
import { ShiftSelectionPolicy } from '../dto/shifts-policy.dto';
import { WorkDayType } from '../dto/working-days-policy.dto';
import { GeofencingEnforcement, ApprovalPolicyMode } from '../dto/attendance-policy.dto';
import { Gender } from '../../common/enums/employee.enum';
import { EmploymentType } from '../../common/enums/employee.enum';
import { AccrualFrequency, AccrualMethod, EncashmentType, HolidayEarnCategory } from '../dto/leaves-policy.dto';
import { PayrollComponentCategory, PayrollComponentType, PayrollComponentSystemType } from '../dto/salary-components-policy.dto';

/**
 * Default Policy Template for New Companies
 * Compliant with Sri Lanka Labor Law (Shops and Offices Act)
 */
export const DEFAULT_POLICY_SETTINGS: PolicySettingsDto = {
    // ════════════════════════════════════════════════════════════════════════
    // PAYROLL CONFIGURATION
    // ════════════════════════════════════════════════════════════════════════
    payrollConfiguration: {
        frequency: PayCycleFrequency.MONTHLY,
        runDay: 'LAST',
        cutoffDaysBeforePayDay: 5,
        calculationMethod: PayrollCalculationMethod.HOURLY_ATTENDANCE_WITH_OT,
        baseRateDivisor: 30,

        // Deduction Rules
        autoDeductUnpaidLeaves: false,
        unpaidLeaveFullDayType: LateDeductionType.DIVISOR_BASED,
        unpaidLeaveFullDayValue: 1,
        unpaidLeaveHalfDayType: LateDeductionType.DIVISOR_BASED,
        unpaidLeaveHalfDayValue: 0.5,
        unpaidLeavesAffectTotalEarnings: false,
        autoDeductLate: false,
        lateDeductionsAffectTotalEarnings: false,
        lateDeductionType: LateDeductionType.DIVISOR_BASED,
        lateDeductionValue: 8,
        lateDeductionGraceMinutes: 0,

        // Overtime Configuration
        otCalculationMethod: OvertimeCalculationMethod.BASIC_DIVISOR,
        otDivisor: 200,
        otHourlyType: LateDeductionType.DIVISOR_BASED,
        otHourlyValue: 8,
        otNormalRate: 1.5,
        otDoubleRate: 2.0,
        otTripleRate: 3.0,

        // Automation
        enableAutoDraft: false,
        draftCreationDaysBeforePayDay: 3,
        autoAcknowledgePayments: false,

        // OT Rules (Sri Lanka: OT after 8 hours/480 mins for working days)
        otRules: [
            {
                id: 'ot-rule-working-day',
                name: 'Normal Workday OT',
                dayStatus: OvertimeDayType.WORKING_DAY,
                isHoliday: false,
                holidayTypes: [],
                otEnabled: true,
                startAfterMinutes: 480, // 8 hours = 480 minutes
                tiers: [{ thresholdMinutes: 0, multiplier: 1.5 }],
                affectTotalEarnings: false // Regular OT does NOT affect EPF/ETF base
            },
            {
                id: 'ot-rule-off-day',
                name: 'Off Day OT',
                dayStatus: OvertimeDayType.OFF_DAY,
                isHoliday: false,
                holidayTypes: [],
                otEnabled: true,
                startAfterMinutes: 0, // OT from first minute
                tiers: [{ thresholdMinutes: 0, multiplier: 2.0 }],
                affectTotalEarnings: true // Off Day OT affects EPF/ETF base (goes to Holiday Pay)
            },
            {
                id: 'ot-rule-holiday-public',
                name: 'Public Holiday OT',
                dayStatus: OvertimeDayType.HOLIDAY,
                isHoliday: true,
                holidayTypes: ['PUBLIC', 'MERCANTILE', 'BANK'],
                otEnabled: true,
                startAfterMinutes: 0, // OT from first minute
                tiers: [{ thresholdMinutes: 0, multiplier: 3.0 }],
                affectTotalEarnings: true // Public Holiday OT affects EPF/ETF base
            }
        ]
    },

    // ════════════════════════════════════════════════════════════════════════
    // SHIFTS CONFIGURATION
    // ════════════════════════════════════════════════════════════════════════
    shifts: {
        list: [
            {
                id: 'shift-standard',
                name: 'Standard Shift',
                startTime: '09:00',
                endTime: '17:00',
                breakTime: 60,
                minStartTime: '08:00',
                maxOutTime: '20:00',
                gracePeriodLate: 15,
                gracePeriodEarly: 0,
                useShiftStartAsClockIn: false,
                autoClockOut: false
            }
        ],
        defaultShiftId: 'shift-standard',
        selectionPolicy: ShiftSelectionPolicy.FIXED
    },

    // ════════════════════════════════════════════════════════════════════════
    // WORKING DAYS (5-day work week - Mon to Fri)
    // ════════════════════════════════════════════════════════════════════════
    workingDays: {
        defaultPattern: {
            MON: { type: WorkDayType.FULL },
            TUE: { type: WorkDayType.FULL },
            WED: { type: WorkDayType.FULL },
            THU: { type: WorkDayType.FULL },
            FRI: { type: WorkDayType.FULL },
            SAT: { type: WorkDayType.OFF },
            SUN: { type: WorkDayType.OFF }
        },
        isDynamic: false
    },

    // ════════════════════════════════════════════════════════════════════════
    // ATTENDANCE CONFIGURATION
    // ════════════════════════════════════════════════════════════════════════
    attendance: {
        allowSelfCheckIn: true,
        requireLocation: false,
        requireDeviceInfo: false,
        geofencing: {
            enabled: false,
            enforcement: GeofencingEnforcement.NONE,
            zones: []
        },
        approvalPolicy: {
            mode: ApprovalPolicyMode.AUTO_APPROVE,
            exceptionTriggers: {
                outsideZone: false,
                deviceMismatch: false,
                unrecognizedIp: false
            }
        },
        apiKeys: []
    },

    // ════════════════════════════════════════════════════════════════════════
    // LEAVE TYPES (Simplified - Annual & Casual Only)
    // ════════════════════════════════════════════════════════════════════════
    leaves: {
        leaveTypes: [
            // Annual Leave - 14 days per year (Shops and Offices Act)
            {
                id: 'leave-annual',
                name: 'Annual Leave',
                code: 'AL',
                color: '#3b82f6',
                applicableGenders: [Gender.MALE, Gender.FEMALE],
                applicableEmploymentTypes: [EmploymentType.PERMANENT, EmploymentType.PROBATION],
                requiresApproval: true,
                approvalRequiredIfConsecutiveMoreThan: 3,
                isShortLeave: false,
                isPaid: true,
                baseAmount: 14,
                accrualFrequency: AccrualFrequency.YEARLY,
                accrualMethod: AccrualMethod.PRO_RATA,
                minDelayBetweenRequestsDays: 0,
                minNoticeDays: 7,
                canApplyBackdated: false,
                maxConsecutiveDays: 14,
                requireDocuments: false,
                canCarryOver: true,
                maxCarryOverDays: 5,
                isEncashable: true,
                encashmentType: EncashmentType.MULTIPLIER_BASED,
                encashmentMultiplier: 1.0,
                isHolidayReplacement: false
            },
            // Casual Leave - 7 days per year
            {
                id: 'leave-casual',
                name: 'Casual Leave',
                code: 'CL',
                color: '#f59e0b',
                applicableGenders: [Gender.MALE, Gender.FEMALE],
                applicableEmploymentTypes: [EmploymentType.PERMANENT, EmploymentType.PROBATION, EmploymentType.CONTRACT],
                requiresApproval: true,
                isShortLeave: false,
                isPaid: true,
                baseAmount: 7,
                accrualFrequency: AccrualFrequency.YEARLY,
                accrualMethod: AccrualMethod.PRO_RATA,
                minDelayBetweenRequestsDays: 0,
                minNoticeDays: 1,
                canApplyBackdated: false,
                maxConsecutiveDays: 3,
                requireDocuments: false,
                canCarryOver: false,
                isEncashable: false,
                isHolidayReplacement: false
            }
        ]
    },

    // ════════════════════════════════════════════════════════════════════════
    // SALARY COMPONENTS (EPF, ETF as per Sri Lanka law)
    // ════════════════════════════════════════════════════════════════════════
    salaryComponents: {
        components: [
        ]
    }
};
