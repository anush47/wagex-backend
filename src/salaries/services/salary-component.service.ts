import { Injectable } from '@nestjs/common';
import { PayrollComponentType, PayrollComponentSystemType } from '../../policies/dto/salary-components-policy.dto';
import { PolicySettingsDto } from '../../policies/dto/policy-settings.dto';
import { SalaryComponent } from '../interfaces/salary-calculation.interface';

@Injectable()
export class SalaryComponentService {
  processComponents(
    policy: PolicySettingsDto,
    basicSalaryForPeriod: number,
    totalUnpaidAmount: number,
    totalLateDeduction: number,
    totalHolidayPayAmount: number,
    totalOtAmount: number,
    holidayPayBreakdown: any[],
    otBreakdown: any[],
  ): { processedComponents: SalaryComponent[]; currentTotalEarnings: number } {
    const payrollConfig = policy.payrollConfiguration;
    const components = policy.salaryComponents?.components || [];

    const systemAdditions = components.filter(
      (c) => c.category === 'ADDITION' && c.systemType && (c.systemType as string) !== PayrollComponentSystemType.NONE,
    );
    const standardAdditions = components.filter(
      (c) =>
        c.category === 'ADDITION' && (!c.systemType || (c.systemType as string) === PayrollComponentSystemType.NONE),
    );
    const systemDeductions = components.filter(
      (c) => c.category === 'DEDUCTION' && c.systemType && (c.systemType as string) !== PayrollComponentSystemType.NONE,
    );
    const standardDeductions = components.filter(
      (c) =>
        c.category === 'DEDUCTION' && (!c.systemType || (c.systemType as string) === PayrollComponentSystemType.NONE),
    );

    const processedComponents: any[] = [];
    let currentTotalEarnings = basicSalaryForPeriod;

    if (payrollConfig?.autoDeductUnpaidLeaves && payrollConfig?.unpaidLeavesAffectTotalEarnings) {
      currentTotalEarnings -= totalUnpaidAmount;
    }

    if (payrollConfig?.autoDeductLate && payrollConfig?.lateDeductionsAffectTotalEarnings) {
      currentTotalEarnings -= totalLateDeduction;
    }

    systemAdditions.forEach((comp) => {
      if (comp.systemType === PayrollComponentSystemType.HOLIDAY_PAY) return;
      const amount = 0;
      processedComponents.push({ ...comp, amount });
      if (comp.affectsTotalEarnings) currentTotalEarnings += amount;
    });

    standardAdditions.forEach((comp) => {
      let amount = 0;
      if (comp.type === PayrollComponentType.FLAT_AMOUNT) {
        amount = comp.value;
      } else if (comp.type === PayrollComponentType.PERCENTAGE_BASIC) {
        amount = (basicSalaryForPeriod * comp.value) / 100;
      }
      processedComponents.push({ ...comp, amount });
      if (comp.affectsTotalEarnings) currentTotalEarnings += amount;
    });

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
        breakdown: holidayPayBreakdown,
      });
      currentTotalEarnings += totalHolidayPayAmount;
    }

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
        breakdown: otBreakdown,
      });
    }

    systemDeductions.forEach((comp) => {
      let amount = 0;
      let employerAmount = 0;
      if (
        comp.systemType === PayrollComponentSystemType.NO_PAY_DEDUCTION ||
        comp.systemType === PayrollComponentSystemType.LATE_DEDUCTION
      ) {
        return;
      } else if (comp.systemType === PayrollComponentSystemType.EPF_EMPLOYEE) {
        amount = (currentTotalEarnings * comp.value) / 100;
        if (comp.employerValue !== undefined) {
          employerAmount = (currentTotalEarnings * comp.employerValue) / 100;
        }
      } else if (comp.systemType === PayrollComponentSystemType.ETF_EMPLOYER) {
        amount = 0;
        employerAmount = (currentTotalEarnings * (comp.employerValue || 0)) / 100;
      }

      processedComponents.push({
        ...comp,
        amount,
        employerAmount,
      });
    });

    standardDeductions.forEach((comp) => {
      let amount = 0;
      if (comp.type === PayrollComponentType.FLAT_AMOUNT) {
        amount = comp.value;
      } else if (comp.type === PayrollComponentType.PERCENTAGE_BASIC) {
        amount = (basicSalaryForPeriod * comp.value) / 100;
      } else if (comp.type === PayrollComponentType.PERCENTAGE_TOTAL_EARNINGS) {
        amount = (currentTotalEarnings * comp.value) / 100;
      }
      processedComponents.push({ ...comp, amount });
    });

    if (payrollConfig?.autoDeductLate && totalLateDeduction > 0) {
      processedComponents.push({
        name: 'Late Arrival Deduction',
        category: 'DEDUCTION',
        type: 'FLAT_AMOUNT',
        amount: totalLateDeduction,
        systemType: PayrollComponentSystemType.LATE_DEDUCTION,
        affectsTotalEarnings: payrollConfig.lateDeductionsAffectTotalEarnings,
      });
    }

    return { processedComponents, currentTotalEarnings };
  }
}
