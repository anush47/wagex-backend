import { PolicySettingsDto } from '../dto/policy-settings.dto';
import {
  PayCycleFrequency,
  PayrollCalculationMethod,
  LateDeductionType,
  OvertimeCalculationMethod,
  OvertimeDayType,
} from '../dto/payroll-settings-policy.dto';
import { ShiftSelectionPolicy } from '../dto/shifts-policy.dto';
import { WorkDayType } from '../dto/working-days-policy.dto';
import { GeofencingEnforcement, ApprovalPolicyMode } from '../dto/attendance-policy.dto';
import { Gender } from '../../common/enums/employee.enum';
import { EmploymentType } from '../../common/enums/employee.enum';
import { AccrualFrequency, AccrualMethod, EncashmentType } from '../dto/leaves-policy.dto';
import {
  PayrollComponentType,
  PayrollComponentCategory,
  PayrollComponentSystemType,
} from '../dto/salary-components-policy.dto';

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
    baseRateDivisor: 25,

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
        tiers: [{ thresholdMinutes: 0, multiplier: 1.5, affectTotalEarnings: false }],
      },
      {
        id: 'ot-rule-off-day',
        name: 'Off Day OT',
        dayStatus: OvertimeDayType.OFF_DAY,
        isHoliday: false,
        holidayTypes: [],
        otEnabled: true,
        startAfterMinutes: 0, // OT from first minute
        tiers: [
          { thresholdMinutes: 0, multiplier: 1.0, affectTotalEarnings: true },
          { thresholdMinutes: 480, multiplier: 3.0, affectTotalEarnings: false },
        ],
      },
      {
        id: 'ot-rule-half-day',
        name: 'Half Day OT',
        dayStatus: OvertimeDayType.HALF_DAY,
        isHoliday: false,
        holidayTypes: [],
        otEnabled: true,
        startAfterMinutes: 360, // OT after 6 hours
        tiers: [{ thresholdMinutes: 0, multiplier: 1.5, affectTotalEarnings: false }],
      },
      {
        id: 'ot-rule-holiday-public',
        name: 'Public Holiday OT',
        dayStatus: OvertimeDayType.HOLIDAY,
        isHoliday: true,
        holidayTypes: ['PUBLIC', 'MERCANTILE', 'BANK'],
        otEnabled: true,
        startAfterMinutes: 0, // OT from first minute
        tiers: [
          { thresholdMinutes: 0, multiplier: 1.0, affectTotalEarnings: true },
          { thresholdMinutes: 240, multiplier: 1.0, affectTotalEarnings: false },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // SHIFTS CONFIGURATION
  // ════════════════════════════════════════════════════════════════════════
  shifts: {
    list: [
      {
        id: 'shift-standard',
        name: 'Standard Shift',
        startTime: '08:00',
        endTime: '17:00',
        breakTime: 60,
        minStartTime: '05:00',
        maxOutTime: '23:00',
        gracePeriodLate: 5,
        gracePeriodEarly: 5,
        useShiftStartAsClockIn: false,
        autoClockOut: false,
      },
    ],
    defaultShiftId: 'shift-standard',
    selectionPolicy: ShiftSelectionPolicy.CLOSEST_START_TIME,
  },

  // ════════════════════════════════════════════════════════════════════════
  // WORKING DAYS (5.5-day work week - Mon to Fri Full, Sat Half)
  // ════════════════════════════════════════════════════════════════════════
  workingDays: {
    defaultPattern: {
      MON: { type: WorkDayType.FULL },
      TUE: { type: WorkDayType.FULL },
      WED: { type: WorkDayType.FULL },
      THU: { type: WorkDayType.FULL },
      FRI: { type: WorkDayType.FULL },
      SAT: { type: WorkDayType.HALF },
      SUN: { type: WorkDayType.OFF },
    },
    isDynamic: false,
  },

  // ════════════════════════════════════════════════════════════════════════
  // ATTENDANCE CONFIGURATION
  // ════════════════════════════════════════════════════════════════════════
  attendance: {
    allowSelfCheckIn: false,
    requireLocation: false,
    requireDeviceInfo: false,
    geofencing: {
      enabled: false,
      enforcement: GeofencingEnforcement.NONE,
      zones: [],
    },
    approvalPolicy: {
      mode: ApprovalPolicyMode.AUTO_APPROVE,
      exceptionTriggers: {
        outsideZone: false,
        deviceMismatch: false,
        unrecognizedIp: false,
      },
    },
    apiKeys: [],
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
        minNoticeDays: 0,
        canApplyBackdated: false,
        maxConsecutiveDays: 14,
        requireDocuments: false,
        canCarryOver: true,
        maxCarryOverDays: 5,
        isEncashable: true,
        encashmentType: EncashmentType.MULTIPLIER_BASED,
        encashmentMultiplier: 1.0,
        isHolidayReplacement: false,
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
        minNoticeDays: 0,
        canApplyBackdated: false,
        maxConsecutiveDays: 3,
        requireDocuments: false,
        canCarryOver: false,
        isEncashable: false,
        isHolidayReplacement: false,
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // SALARY COMPONENTS (EPF, ETF as per Sri Lanka law)
  // EPF: Employee 8%, Employer 12% | ETF: Employer 3%
  // ════════════════════════════════════════════════════════════════════════
  salaryComponents: {
    components: [
      {
        id: 'epf-employee',
        name: 'EPF',
        category: PayrollComponentCategory.DEDUCTION,
        type: PayrollComponentType.PERCENTAGE_TOTAL_EARNINGS,
        value: 8, // Employee deduction: 8% of total earnings
        systemType: PayrollComponentSystemType.EPF_EMPLOYEE,
        isStatutory: true,
        affectsTotalEarnings: true,
        employerValue: 12, // Employer contribution: 12% (stored on same component)
      },
      {
        id: 'etf-employer',
        name: 'ETF',
        category: PayrollComponentCategory.DEDUCTION,
        type: PayrollComponentType.PERCENTAGE_TOTAL_EARNINGS,
        value: 0, // No employee deduction for ETF
        systemType: PayrollComponentSystemType.ETF_EMPLOYER,
        isStatutory: true,
        affectsTotalEarnings: true,
        employerValue: 3, // Employer contribution: 3% of total earnings
      },
      {
        id: '53ee5479-668f-4844-b0fa-bc998ce207b4',
        name: 'Holiday Pay',
        category: PayrollComponentCategory.ADDITION,
        type: PayrollComponentType.FLAT_AMOUNT,
        value: 0,
        systemType: PayrollComponentSystemType.HOLIDAY_PAY,
        isStatutory: true,
        employerValue: 0,
        affectsTotalEarnings: true,
      },
    ],
  },
  calendarId: '8871f149-7acc-4cab-b0da-c0ac57343a42',
};
