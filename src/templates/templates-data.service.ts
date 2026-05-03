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
        const [companyId, month, year] = compositeId.split(':');
        const ids = query.ids ? query.ids.split(',') : [];
        data = await this.getSalarySheetData(companyId, parseInt(month), parseInt(year), ids);
        break;
      }
      case DocumentType.ATTENDANCE_REPORT: {
        const [companyId, employeeId, startDate, endDate] = parts;
        data = await this.getAttendanceData(companyId, employeeId, startDate, endDate);
        break;
      }
      case DocumentType.EPF_FORM:
        data = await this.getEpfFormData(compositeId);
        break;
      case DocumentType.ETF_FORM:
        data = await this.getEtfFormData(compositeId);
        break;
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

    // Derive EPF liable earnings from the stored component rate (mirrors epf.service.ts logic)
    let liableEarnings = 0;
    if (epfEmployeeComp && epfEmployeeComp.value > 0) {
      liableEarnings = epfEmployee / (epfEmployeeComp.value / 100);
    } else if (salary.basicSalary > 0) {
      liableEarnings = salary.basicSalary;
    }

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
      liableEarnings,
      totalCustomAdditions,
      totalCustomDeductions,
      // Override raw spread values with adjustment-inclusive computed values
      otAmount: otPay,
      holidayPayAmount: holidayPay,
      noPayAmount: noPay,
    };
}

  private async getSalaryData(salaryId: string) {
    const salary = await this.prisma.salary.findUnique({
      where: { id: salaryId },
      include: {
        employee: {
          include: {
            company: true,
            department: { select: { name: true } },
            details: true,
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
      monthYear: salary.month && salary.year ? format(new Date(salary.year, salary.month - 1, 1), 'MMMM yyyy') : '',
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

    // Create metadata for additions to show statutory indicators (*)
    const additionMetadata: Record<string, { isStatutory: boolean }> = {};
    additionColumns.forEach(name => {
      // Find the first occurrence of this addition to check its statutory status
      const sample = processedSalaries.find(s => s.additions.some(a => a.name === name));
      const addition = sample?.additions.find(a => a.name === name);
      additionMetadata[name] = { isStatutory: addition?.isStatutory || false };
    });

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
      liableEarnings: 0,
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
      totals.liableEarnings += s.liableEarnings || 0;

      s.additions.forEach((a) => (totals.additionAmounts[a.name] += a.amount));
      s.deductions.forEach((d) => (totals.deductionAmounts[d.name] += d.amount));
    });

    const firstSal = rawSalaries[0];
    const periodStartDate = firstSal ? format(new Date(firstSal.periodStartDate), 'yyyy-MM-dd') : '';
    const periodEndDate = firstSal ? format(new Date(firstSal.periodEndDate), 'yyyy-MM-dd') : '';
    const monthYear = format(new Date(year, month - 1, 1), 'MMMM yyyy').toUpperCase();

    return {
      company,
      month,
      year,
      monthYear,
      periodStartDate,
      periodEndDate,
      salaries: processedSalaries,
      additionColumns,
      deductionColumns,
      additionMetadata,
      totals,
    };
  }

  private async getAttendanceData(companyId: string, employeeId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const [employee, sessions, leaveRequests] = await Promise.all([
      this.prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          company: true,
          department: { select: { name: true } },
        },
      }),
      this.prisma.attendanceSession.findMany({
        where: {
          employeeId,
          companyId,
          date: { gte: start, lte: end },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          employeeId,
          status: 'APPROVED',
          startDate: { lte: end },
          endDate: { gte: start },
        },
        select: {
          id: true,
          type: true,
          startDate: true,
          endDate: true,
          days: true,
          status: true,
          reason: true,
          responseReason: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const logs = sessions.map((s) => ({
      id: s.id,
      date: format(new Date(s.date), 'yyyy-MM-dd'),
      shiftName: s.shiftName || null,
      shiftStartTime: s.shiftStartTime || null,
      shiftEndTime: s.shiftEndTime || null,
      shiftBreakMinutes: s.shiftBreakMinutes || 0,
      checkInTime: s.checkInTime ? format(new Date(s.checkInTime), 'HH:mm') : null,
      checkOutTime: s.checkOutTime ? format(new Date(s.checkOutTime), 'HH:mm') : null,
      checkInLocation: s.checkInLocation || null,
      checkOutLocation: s.checkOutLocation || null,
      totalMinutes: s.totalMinutes || 0,
      breakMinutes: s.breakMinutes || 0,
      workMinutes: s.workMinutes || 0,
      overtimeMinutes: s.overtimeMinutes || 0,
      isLate: s.isLate,
      lateMinutes: s.lateMinutes || 0,
      isEarlyLeave: s.isEarlyLeave,
      earlyLeaveMinutes: s.earlyLeaveMinutes || 0,
      isOnLeave: s.isOnLeave,
      isHalfDay: s.isHalfDay,
      hasShortLeave: s.hasShortLeave,
      autoCheckout: s.autoCheckout,
      manuallyEdited: s.manuallyEdited,
      workDayStatus: s.workDayStatus,
      inApprovalStatus: s.inApprovalStatus,
      outApprovalStatus: s.outApprovalStatus,
      payrollStatus: s.salaryId ? 'PROCESSED' : 'PENDING',
      remarks: s.remarks || null,
      metadata: s.metadata || {},
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    const summary = {
      totalDays: logs.length,
      presentDays: logs.filter((l) => l.checkInTime && !l.isOnLeave).length,
      absentDays: logs.filter((l) => !l.checkInTime && !l.isOnLeave).length,
      lateDays: logs.filter((l) => l.isLate).length,
      overtimeMinutes: logs.reduce((sum, l) => sum + l.overtimeMinutes, 0),
      leavesTaken: leaveRequests.reduce((sum, l) => sum + (l.days || 0), 0),
    };

    return {
      employee,
      company: employee?.company,
      startDate,
      endDate,
      logs,
      leaves: leaveRequests.map((l) => ({
        ...l,
        startDate: format(new Date(l.startDate), 'yyyy-MM-dd'),
        endDate: format(new Date(l.endDate), 'yyyy-MM-dd'),
      })),
      summary,
    };
  }

  private async getEpfFormData(epfRecordId: string) {
    const record = await this.prisma.epfRecord.findUnique({
      where: { id: epfRecordId },
      include: {
        salaries: {
          include: {
            employee: {
              select: { id: true, fullName: true, employeeNo: true, nic: true },
            },
          },
        },
      },
    });

    if (!record) throw new Error('EPF record not found');

    const company = await this.prisma.company.findUnique({ where: { id: record.companyId } });

    const salaries = record.salaries.map((s) => {
      const components = (s.components as any[]) || [];
      const epfEmployeeComp = components.find((c) => c.systemType === 'EPF_EMPLOYEE');
      const epfEmployerComp = components.find((c) => c.systemType === 'EPF_EMPLOYER');
      const epfEmployee = epfEmployeeComp?.amount || 0;
      const epfEmployer = epfEmployerComp?.amount || epfEmployeeComp?.employerAmount || 0;
      let liableEarnings = 0;
      if (epfEmployeeComp && epfEmployeeComp.value > 0) {
        liableEarnings = epfEmployee / (epfEmployeeComp.value / 100);
      } else {
        liableEarnings = s.basicSalary || 0;
      }
      return {
        id: s.id,
        employee: s.employee,
        basicSalary: s.basicSalary,
        liableEarnings,
        epfEmployee,
        epfEmployer,
        payDate: s.payDate ? format(new Date(s.payDate), 'yyyy-MM-dd') : null,
        status: s.status,
      };
    });

    const totals = {
      count: salaries.length,
      totalEmployeeContribution: salaries.reduce((sum, s) => sum + s.epfEmployee, 0),
      totalEmployerContribution: salaries.reduce((sum, s) => sum + s.epfEmployer, 0),
      totalContribution: salaries.reduce((sum, s) => sum + s.epfEmployee + s.epfEmployer, 0),
      liableEarnings: salaries.reduce((sum, s) => sum + s.liableEarnings, 0),
    };

    const monthYear = format(new Date(record.year, record.month - 1, 1), 'MMMM yyyy');

    const firstSal = record.salaries[0];
    const firstSalComponents = (firstSal?.components as any[]) || [];
    const epfEmployeePercentage = firstSalComponents.find((c: any) => c.systemType === 'EPF_EMPLOYEE')?.value || 8;
    const epfEmployerPercentage = firstSalComponents.find((c: any) => c.systemType === 'EPF_EMPLOYER')?.value || 12;

    return {
      company,
      month: record.month,
      year: record.year,
      monthYear,
      epfRecord: record,
      salaries,
      totals,
      epfEmployeePercentage,
      epfEmployerPercentage,
    };
  }

  private async getEtfFormData(etfRecordId: string) {
    const record = await this.prisma.etfRecord.findUnique({
      where: { id: etfRecordId },
      include: {
        salaries: {
          include: {
            employee: {
              select: { id: true, fullName: true, employeeNo: true, nic: true },
            },
          },
        },
      },
    });

    if (!record) throw new Error('ETF record not found');

    const company = await this.prisma.company.findUnique({ where: { id: record.companyId } });

    const salaries = record.salaries.map((s) => {
      const components = (s.components as any[]) || [];
      const etfComp = components.find((c) => c.systemType === 'ETF_EMPLOYER');
      const etfEmployer = etfComp?.employerAmount || etfComp?.amount || 0;
      // Derive liable earnings from ETF rate (same base as EPF)
      const epfComp = components.find((c) => c.systemType === 'EPF_EMPLOYEE');
      let liableEarnings = 0;
      if (epfComp && epfComp.value > 0) {
        liableEarnings = (epfComp.amount || 0) / (epfComp.value / 100);
      } else {
        liableEarnings = s.basicSalary || 0;
      }
      return {
        id: s.id,
        employee: s.employee,
        basicSalary: s.basicSalary,
        etfEmployer,
        liableEarnings,
        payDate: s.payDate ? format(new Date(s.payDate), 'yyyy-MM-dd') : null,
        status: s.status,
      };
    });

    const totals = {
      count: salaries.length,
      totalContribution: salaries.reduce((sum, s) => sum + s.etfEmployer, 0),
      liableEarnings: salaries.reduce((sum, s) => sum + s.liableEarnings, 0),
    };

    const monthYear = format(new Date(record.year, record.month - 1, 1), 'MMMM yyyy');

    const firstEtfSal = record.salaries[0];
    const firstEtfSalComponents = (firstEtfSal?.components as any[]) || [];
    const etfPercentage = firstEtfSalComponents.find((c: any) => c.systemType === 'ETF_EMPLOYER')?.value || 3;

    return {
      company,
      month: record.month,
      year: record.year,
      monthYear,
      etfRecord: record,
      salaries,
      totals,
      etfPercentage,
    };
  }
}
