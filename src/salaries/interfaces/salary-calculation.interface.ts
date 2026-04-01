import { Prisma } from '@prisma/client';

export interface SalaryComponent {
  id: string;
  name: string;
  amount: number;
  type: 'EARNING' | 'DEDUCTION';
  isTaxable: boolean;
  isStatutory: boolean;
}

export interface SalaryPreview {
  employeeId: string;
  periodStartDate: string | Date;
  periodEndDate: string | Date;
  payDate?: string | Date;
  basicSalary: number;
  otAmount: number;
  otAdjustment?: number;
  otAdjustmentReason?: string;
  otBreakdown?: Prisma.JsonValue;
  holidayPayAmount?: number;
  holidayPayBreakdown?: Prisma.JsonValue;
  noPayAmount: number;
  noPayBreakdown?: Prisma.JsonValue;
  taxAmount: number;
  components: SalaryComponent[];
  advanceDeduction: number;
  advanceAdjustments?: { advanceId: string; amount: number }[];
  lateDeduction?: number;
  lateAdjustment?: number;
  lateAdjustmentReason?: string;
  holidayPayAdjustment?: number;
  holidayPayAdjustmentReason?: string;
  recoveryAdjustment?: number;
  recoveryAdjustmentReason?: string;
  netSalary: number;
  remarks?: string;
  sessionIds?: string[];
}

export interface SalaryGroupPreview {
  companyId: string;
  employees: SalaryPreview[];
}
