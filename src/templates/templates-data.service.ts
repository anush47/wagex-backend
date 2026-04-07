import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentType } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { format } from 'date-fns';

@Injectable()
export class TemplatesDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService
  ) {}

  async getData(type: DocumentType, compositeId: string, query: any = {}) {
    const parts = compositeId.split('_');
    let data : any;

    switch (type) {
      case DocumentType.PAYSLIP:
        data = await this.getSalaryData(compositeId);
        break;
      case DocumentType.SALARY_SHEET: {
        const [companyId, month, year] = parts;
        const ids = query.ids ? query.ids.split(',') : [];
        data = await this.getSalarySheetData(companyId, parseInt(month), parseInt(year), ids);
        break;
      }
      case DocumentType.ATTENDANCE_REPORT: {
        const [companyId, employeeId, startDate, endDate] = parts;
        data = await this.getAttendanceData(companyId, employeeId, startDate, endDate);
        break;
      }
      default:
        throw new Error('Unsupported document type for data fetching');
    }

    if (data) {
      // Find company object (could be root or nested in employee)
      let company = data.company;
      if (!company && data.employee?.company) {
        company = data.employee.company;
      }

      if (company) {
        company.logo = await this.getPrintLogo(company);
      }
      
      // Also resolve employee photos if present
      if (data.employee) {
        data.employee.photo = await this.resolveStorageUrl(data.employee.photo);
      }
      if (data.salaries) {
        for (const s of data.salaries) {
          if (s.employee) {
            s.employee.photo = await this.resolveStorageUrl(s.employee.photo);
          }
        }
      }
    }

    return data;
  }

  private async resolveStorageUrl(keyOrUrl: string | null): Promise<string | null> {
    if (!keyOrUrl) return null;
    if (keyOrUrl.startsWith('http') || keyOrUrl.startsWith('blob:')) return keyOrUrl;
    
    try {
      return await this.storageService.getSignedUrl(keyOrUrl);
    } catch (e) {
      return null;
    }
  }

  private async getPrintLogo(company: any): Promise<string | null> {
    const files = Array.isArray(company.files) ? company.files : [];
    // Loosen the type check as JSON metadata might vary, prioritize the exact name "logo_print"
    const printLogoFile = files.find((f: any) => 
      f.name === 'logo_print' || 
      (f.name?.startsWith('logo_print') && /\.(webp|png|jpg|jpeg)$/i.test(f.url || ''))
    );
    const rawKey = printLogoFile?.url || printLogoFile?.key || company.logo || null;
    return this.resolveStorageUrl(rawKey);
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
    const netSalary = grossSalary - totalDeductions;

    // Provide additionAmounts and deductionAmounts objects for easier template access (matches sample data)
    const additionAmounts: Record<string, number> = {};
    additions.forEach(a => additionAmounts[a.name] = a.amount);
    
    const deductionAmounts: Record<string, number> = {};
    deductions.forEach(d => deductionAmounts[d.name] = d.amount);

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
      additionAmounts,
      deductionAmounts,
      totalAdditions,
      totalDeductions,
      grossSalary,
      netSalary,
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
      month: salary.month,
      year: salary.year,
      periodStartDate: format(new Date(salary.periodStartDate), 'yyyy-MM-dd'),
      periodEndDate: format(new Date(salary.periodEndDate), 'yyyy-MM-dd'),
      payDate: format(new Date(salary.payDate), 'yyyy-MM-dd'),
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
      otAmount: 0,
      holidayPayAmount: 0,
      noPayAmount: 0,
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
      additionAmounts: {},
      deductionAmounts: {},
      count: processedSalaries.length,
    };

    additionColumns.forEach((name) => (totals.additionAmounts[name] = 0));
    deductionColumns.forEach((name) => (totals.deductionAmounts[name] = 0));

    processedSalaries.forEach((s) => {
      totals.basicSalary += s.basicSalary || 0;
      totals.otAmount += s.otPay || 0;
      totals.holidayPayAmount += s.holidayPay || 0;
      totals.noPayAmount += s.noPay || 0;
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

      s.additions.forEach((a) => (totals.additionAmounts[a.name] += a.amount));
      s.deductions.forEach((d) => (totals.deductionAmounts[d.name] += d.amount));
    });

    const firstSal = rawSalaries[0];
    const periodStartDate = firstSal ? format(new Date(firstSal.periodStartDate), 'yyyy-MM-dd') : '';
    const periodEndDate = firstSal ? format(new Date(firstSal.periodEndDate), 'yyyy-MM-dd') : '';

    return {
      company,
      month,
      year,
      periodStartDate,
      periodEndDate,
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
