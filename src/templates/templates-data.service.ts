import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentType } from '@prisma/client';

@Injectable()
export class TemplatesDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getData(type: DocumentType, compositeId: string, query: any = {}) {
    const parts = compositeId.split('_');

    switch (type) {
      case DocumentType.PAYSLIP:
        return this.getSalaryData(compositeId);
      case DocumentType.SALARY_SHEET: {
        const [companyId, month, year] = parts;
        const ids = query.ids ? query.ids.split(',') : [];
        return this.getSalarySheetData(companyId, parseInt(month), parseInt(year), ids);
      }
      case DocumentType.ATTENDANCE_REPORT: {
        const [companyId, employeeId, startDate, endDate] = parts;
        return this.getAttendanceData(companyId, employeeId, startDate, endDate);
      }
      default:
        throw new Error('Unsupported document type for data fetching');
    }
  }

  private processSalaryForTemplate(salary: any) {
    const components = (salary.components as any[]) || [];

    // Explicit system components
    const epfEmployeeComp = components.find((c) => c.systemType === 'EPF_EMPLOYEE');
    const epfEmployerComp = components.find((c) => c.systemType === 'EPF_EMPLOYER');
    const etfEmployerComp = components.find((c) => c.systemType === 'ETF_EMPLOYER');

    const epfEmployee = epfEmployeeComp?.amount || 0;
    const epfEmployer = epfEmployerComp?.amount || epfEmployeeComp?.employerAmount || 0;
    const etfEmployer = etfEmployerComp?.amount || etfEmployerComp?.employerAmount || 0;

    const holidayPay = (salary.holidayPayAmount || 0) + (salary.holidayPayAdjustment || 0);
    const otPay = (salary.otAmount || 0) + (salary.otAdjustment || 0);
    const noPay = salary.noPayAmount || 0;
    const advanceDeduction = salary.advanceDeduction || 0;
    const lateDeduction = (salary.lateDeduction || 0) + (salary.lateAdjustment || 0);
    const taxAmount = salary.taxAmount || 0;

    // Collections (excluding system types that are already explicit)
    const additions = components.filter(
      (c) =>
        c.category === 'ADDITION' &&
        (!c.systemType || c.systemType === 'NONE') &&
        c.id !== 'holiday-pay' &&
        c.id !== 'ot-pay',
    );
    const deductions = components.filter(
      (c) =>
        c.category === 'DEDUCTION' &&
        (!c.systemType || c.systemType === 'NONE' || c.systemType === 'TAX') &&
        c.systemType !== 'EPF_EMPLOYEE' &&
        c.systemType !== 'LATE_DEDUCTION' &&
        c.systemType !== 'NO_PAY_DEDUCTION',
    );

    const totalCustomAdditions = additions.reduce((sum, c) => sum + c.amount, 0);
    const totalCustomDeductions = deductions.reduce((sum, c) => sum + c.amount, 0);

    const totalAdditions = totalCustomAdditions + otPay + holidayPay;
    const totalDeductions = totalCustomDeductions + epfEmployee + advanceDeduction + lateDeduction + taxAmount + noPay;

    const grossSalary = (salary.basicSalary || 0) + totalAdditions;

    return {
      ...salary,
      epfEmployee,
      epfEmployer,
      etfEmployer,
      holidayPay,
      otPay,
      noPay,
      advanceDeduction,
      lateDeduction,
      taxAmount,
      additions,
      deductions,
      totalAdditions,
      totalDeductions,
      grossSalary,
    };
  }

  private async getSalaryData(salaryId: string) {
    const salary = await this.prisma.salary.findUnique({
      where: { id: salaryId },
      include: {
        employee: {
          include: { 
            company: true,
            department: { select: { name: true } }
          },
        },
      },
    });

    if (!salary) {
      throw new NotFoundException('Salary record not found');
    }

    const processedSalary = this.processSalaryForTemplate(salary);
    return {
      salary: processedSalary,
      employee: salary.employee,
      company: salary.employee.company,
    };
  }

  private async getSalarySheetData(companyId: string, month: number, year: number, ids: string[] = []) {
    const where: any = { companyId };
    if (ids.length > 0) {
      where.id = { in: ids };
    } else {
      where.month = month;
      where.year = year;
    }

    const rawSalaries = await this.prisma.salary.findMany({
      where,
      include: { 
        employee: {
          include: {
            department: { select: { name: true } }
          }
        } 
      },
    });
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });

    const processedSalaries = rawSalaries.map((s) => this.processSalaryForTemplate(s));

    const additionNames = new Set<string>();
    const deductionNames = new Set<string>();

    processedSalaries.forEach((s) => {
      s.additions.forEach((a) => additionNames.add(a.name));
      s.deductions.forEach((d) => deductionNames.add(d.name));
    });

    const additionColumns = Array.from(additionNames);
    const deductionColumns = Array.from(deductionNames);

    const totals: any = {
      basicSalary: 0,
      otPay: 0,
      holidayPay: 0,
      noPay: 0,
      epfEmployee: 0,
      epfEmployer: 0,
      etfEmployer: 0,
      advanceDeduction: 0,
      lateDeduction: 0,
      taxAmount: 0,
      totalAdditions: 0,
      totalDeductions: 0,
      grossSalary: 0,
      netSalary: 0,
      customAdditions: {},
      customDeductions: {},
      count: processedSalaries.length,
    };

    additionColumns.forEach((name) => (totals.customAdditions[name] = 0));
    deductionColumns.forEach((name) => (totals.customDeductions[name] = 0));

    processedSalaries.forEach((s) => {
      totals.basicSalary += s.basicSalary || 0;
      totals.otPay += s.otPay || 0;
      totals.holidayPay += s.holidayPay || 0;
      totals.noPay += s.noPay || 0;
      totals.epfEmployee += s.epfEmployee || 0;
      totals.epfEmployer += s.epfEmployer || 0;
      totals.etfEmployer += s.etfEmployer || 0;
      totals.advanceDeduction += s.advanceDeduction || 0;
      totals.lateDeduction += s.lateDeduction || 0;
      totals.taxAmount += s.taxAmount || 0;
      totals.totalAdditions += s.totalAdditions || 0;
      totals.totalDeductions += s.totalDeductions || 0;
      totals.grossSalary += s.grossSalary || 0;
      totals.netSalary += s.netSalary || 0;

      s.additions.forEach((a) => (totals.customAdditions[a.name] += a.amount));
      s.deductions.forEach((d) => (totals.customDeductions[d.name] += d.amount));
    });

    return {
      company,
      month,
      year,
      salaries: processedSalaries,
      additionColumns,
      deductionColumns,
      totals,
    };
  }

  private async getAttendanceData(companyId: string, employeeId: string, startDate: string, endDate: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { 
        company: true,
        department: { select: { name: true } }
      },
    });
    // Placeholder for attendance logs
    const logs = [];
    return { employee, startDate, endDate, logs };
  }
}
