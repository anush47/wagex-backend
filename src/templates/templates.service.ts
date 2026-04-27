import { Injectable, NotFoundException, BadRequestException, OnModuleInit, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto, TemplateQueryDto } from './dto/template.dto';
import * as Handlebars from 'handlebars';
import { DocumentType, TemplateStatus } from '@prisma/client';
import { TemplatesDataService } from './templates-data.service';
import { BillingStatusService } from '../billing/services/billing-status.service';

@Injectable()
export class TemplatesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataService: TemplatesDataService,
    private readonly billingStatusService: BillingStatusService,
  ) {}

  onModuleInit() {
    this.registerHelpers(Handlebars);
  }

  private registerHelpers(instance: typeof Handlebars) {
    instance.registerHelper('formatCurrency', (value) => {
      if (typeof value !== 'number') return value;
      return new Intl.NumberFormat('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    });

    instance.registerHelper('formatDate', (date) => {
      if (!date || (typeof date !== 'string' && typeof date !== 'number' && !(date instanceof Date))) return '';
      try { return new Date(date).toLocaleDateString(); } catch { return date; }
    });

    instance.registerHelper('add', (a, b) => (Number(a) || 0) + (Number(b) || 0));

    instance.registerHelper('eq', (a, b) => a === b);

    instance.registerHelper('chunk', function(array, size) {
      if (!Array.isArray(array)) return [];
      const chunkSize = typeof size === 'number' ? size : 20;
      const result: any[] = [];
      for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
      }
      return result;
    });

    instance.registerHelper('getAmount', function(items, name) {
      if (!Array.isArray(items)) return 0;
      const searchName = typeof name === 'string' ? name : null;
      if (!searchName) return 0;
      const item = items.find((i: any) => i.name === searchName);
      return item ? item.amount : 0;
    });

    instance.registerHelper('getCustomTotal', function(totals, name) {
      if (!totals || typeof totals !== 'object') return 0;
      const searchName = typeof name === 'string' ? name : null;
      if (!searchName) return 0;
      return (totals as any)[searchName] || 0;
    });
  }

  async create(dto: CreateTemplateDto, user: any) {
    let companyId = dto.companyId;

    // Inference Logic
    if (!companyId && user.role === 'EMPLOYER') {
      const memberships = user.memberships || [];
      if (memberships.length === 1) {
        companyId = memberships[0].companyId;
      } else if (memberships.length > 1) {
        throw new BadRequestException('Multiple companies found. Please specify companyId.');
      } else {
        throw new ForbiddenException('You do not belong to any company.');
      }
    }

    // Security/Tenancy Check
    if (companyId && user.role === 'EMPLOYER') {
      const hasAccess = user.memberships?.some((m: any) => m.companyId === companyId);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this company.');
      }
    }

    // Admins can create global templates (companyId: null)
    if (!companyId && user.role !== 'ADMIN') {
        throw new BadRequestException('Only admins can create global templates.');
    }

    const finalDto = {
      ...dto,
      companyId,
      status: dto.status || TemplateStatus.DRAFT,
      isActive: false, // Force false on create to prevent bypass
    };
    return this.prisma.documentTemplate.create({
      data: finalDto as any,
    });
  }

  async findAll(query: TemplateQueryDto, user: any) {
    const { companyId: requestedCompanyId, type, isActive, status } = query;
    const where: any = { type };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (status) {
      where.status = status;
    }

    // Tenancy Check for Fetch
    const accessibleCompanyId = user.role === 'ADMIN' 
      ? requestedCompanyId 
      : requestedCompanyId || user.memberships?.[0]?.companyId; // Employer must pick a context

    if (user.role === 'EMPLOYER' && accessibleCompanyId) {
       const hasAccess = user.memberships?.some((m: any) => m.companyId === accessibleCompanyId);
       if (!hasAccess) {
         throw new ForbiddenException('You do not have access to this company.');
       }
    }

    return this.prisma.documentTemplate.findMany({
      where: {
        ...where,
        OR: [{ companyId: null }, ...(accessibleCompanyId ? [{ companyId: accessibleCompanyId }] : [])],
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, user: any) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Template not found');

    // Tenancy Check
    if (template.companyId && user.role === 'EMPLOYER') {
        const hasAccess = user.memberships?.some((m: any) => m.companyId === template.companyId);
        if (!hasAccess) throw new ForbiddenException('No access to this template');
    }

    return template;
  }

  async update(id: string, dto: UpdateTemplateDto, user: any) {
    const template = await this.findOne(id, user);
    const finalDto = { ...dto };
    const newStatus = dto.status || template.status;
    const newActiveState = dto.isActive !== undefined ? dto.isActive : template.isActive;

    // Immutability for Approved Layouts
    if (template.status === 'APPROVED' && user.role !== 'ADMIN') {
      const isTryingToEditContent = dto.html || dto.css || dto.helpers || dto.config || dto.name || dto.description;
      if (isTryingToEditContent) {
        throw new BadRequestException('Approved layouts are immutable. Create a copy to make changes.');
      }
    }

    // Role checks for activation
    if (newActiveState && newStatus !== 'APPROVED') {
      throw new BadRequestException('Only approved layouts can be activated.');
    }

    if (newStatus !== 'APPROVED') {
      finalDto.isActive = false;
    }

    // Atomically deactivate all other templates for the same type+company before activating this one
    if (finalDto.isActive) {
      return this.prisma.$transaction([
        this.prisma.documentTemplate.updateMany({
          where: {
            id: { not: id },
            type: template.type,
            companyId: template.companyId,
            isActive: true,
          },
          data: { isActive: false },
        }),
        this.prisma.documentTemplate.update({
          where: { id },
          data: finalDto as any,
        }),
      ]).then((results) => results[1]);
    }

    return this.prisma.documentTemplate.update({
      where: { id },
      data: finalDto as any,
    });
  }

  async remove(id: string, user: any) {
    await this.findOne(id, user);
    return this.prisma.documentTemplate.delete({
      where: { id },
    });
  }

  async getLiveData(type: DocumentType, resourceId?: string, user?: any, query?: any) {
    if (!resourceId) {
      return this.getVariables(type);
    }

    // Security & Tenancy Validation
    if (user && user.role !== 'ADMIN') {
        const parts = resourceId.split('_');
        let companyIdToCheck: string | null = null;
        
        switch (type) {
            case DocumentType.PAYSLIP: {
                const salary = await this.prisma.salary.findUnique({
                    where: { id: resourceId },
                    include: { employee: { select: { companyId: true } } }
                });
                companyIdToCheck = salary?.employee?.companyId || null;
                break;
            }
            case DocumentType.SALARY_SHEET:
                companyIdToCheck = parts[0];
                break;
            case DocumentType.ATTENDANCE_REPORT:
                companyIdToCheck = parts[0];
                break;
        }

        if (companyIdToCheck) {
            const hasAccess = user.memberships?.some((m: any) => m.companyId === companyIdToCheck);
            if (!hasAccess) {
                throw new ForbiddenException('No access to this data context.');
            }
        }
    }

    return this.dataService.getData(type, resourceId, query);
  }

  /** Resolve companyId + periodEndDate from template type + resourceId and check billing. */
  private async assertBillingForTemplate(type: DocumentType, resourceId: string): Promise<void> {
    if (type === DocumentType.PAYSLIP) {
      let salary: { periodEndDate: Date | null; employee: { companyId: string } | null } | null = null;
      try {
        salary = await this.prisma.salary.findUnique({
          where: { id: resourceId },
          select: { periodEndDate: true, employee: { select: { companyId: true } } },
        });
      } catch {
        return; // DB lookup failed — skip check rather than block the render
      }
      if (salary?.employee?.companyId && salary.periodEndDate) {
        await this.billingStatusService.assertBillingForPeriodEnd(
          salary.employee.companyId,
          new Date(salary.periodEndDate),
        );
      }
    } else if (type === DocumentType.SALARY_SHEET) {
      // resourceId format: "companyId:month:year"
      const parts = resourceId.split(':');
      if (parts.length < 3) {
        throw new BadRequestException('Invalid resourceId for SALARY_SHEET: expected "companyId:month:year"');
      }
      const [companyId, month, year] = parts;
      const periodEnd = this.billingStatusService.periodEndFromMonthYear(Number(month), Number(year));
      await this.billingStatusService.assertBillingForPeriodEnd(companyId, periodEnd);
    }
    // Other document types (ATTENDANCE etc.) are not period-billed — no check needed
  }

  async render(templateId: string, resourceId: string, query: any = {}, user?: any) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Tenancy check: reuse the same authorization logic as getLiveData
    if (user) {
      await this.getLiveData(template.type, resourceId, user, query);
    }

    // Billing check: enforce invoice purchase for period-based document types
    await this.assertBillingForTemplate(template.type, resourceId);

    const data = await this.dataService.getData(template.type, resourceId, query);
    
    // Create a local Handlebars instance to avoid helper collisions
    const instance = (Handlebars as any).create?.() || Handlebars;
    this.registerHelpers(instance);

    // Register custom helpers from template
    if (template.helpers) {
      try {
        const registerCustom = new Function('Handlebars', template.helpers);
        registerCustom(instance);
      } catch (e) {
        console.error('Custom helper registration failed:', e);
      }
    }

    const html = template.html;
    const compiledTemplate = instance.compile(html);
    const renderedHtml = compiledTemplate(data);

    return {
      html: renderedHtml,
      css: template.css,
      metadata: {
        name: template.name,
        type: template.type,
        config: template.config,
      },
    };
  }

  getVariables(type: DocumentType) {
    // Variables are now served via the frontend sample-data.ts defaults.
    // This endpoint is kept for backwards compat but returns the same real-schema data.
    const commonEmployee = {
      id: '00000000-0000-0000-0000-000000000001',
      employeeNo: 1,
      nic: '200000000000',
      nameWithInitials: 'J. DOE',
      fullName: 'JOHN DOE',
      designation: 'Senior Developer',
      address: 'No. 45, Sample Road, City Area.',
      phone: '+94 77 123 4567',
      email: 'john.doe@example.com',
      employmentType: 'PERMANENT',
      joinedDate: '2026-01-15',
      resignedDate: null,
      gender: 'MALE',
      status: 'ACTIVE',
      basicSalary: 85000,
      remark: 'Excellent performance',
      photo: 'https://i.pravatar.cc/300',
      department: { 
        id: 'dept-001',
        name: 'Technology',
        description: 'Software and Infrastructure',
        createdAt: '2020-01-01T00:00:00Z',
      },
      manager: {
        id: '00000000-0000-0000-0000-000000000002',
        employeeNo: 2,
        fullName: 'SARAH CHIEF',
        designation: 'CTO',
      },
      policy: {
        id: 'policy-001',
        name: 'Standard Corporate Policy',
        description: 'Standard 45-hour work week with 1.5x OT',
        settings: {
          otRate: 1.5,
          workingDaysPerMonth: 22,
          standardWorkHours: 8,
          isEpfEnabled: true,
          isEtfEnabled: true,
          workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          payrollConfiguration: {
            frequency: 'MONTHLY',
          }
        },
        createdAt: '2020-01-01T00:00:00Z',
        updatedAt: '2020-01-01T00:00:00Z',
      },
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-03-31T00:00:00Z',
      canSelfEdit: true,
      files: [],
      details: {
        bankName: 'Sample Bank PLC',
        bankBranch: 'Main City',
        accountNumber: '001122334455',
        mothersName: 'JANE DOE SR',
        fathersName: 'JOHN DOE SR',
        maritalStatus: 'SINGLE',
        spouseName: '',
        nationality: 'Sri Lankan',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+94 71 000 0000',
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
      },
    };

    const commonCompany = {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'WageX Solutions (Pvt) Ltd',
      active: true,
      address: 'No. 123, Tech Plaza, Business District, Colombo 03.',
      phone: '+94 11 200 0000',
      email: 'contact@wagex.io',
      logo: 'https://picsum.photos/400/200?grayscale',
      timezone: 'Asia/Colombo',
      employerNumber: 'EPF/00/0000',
      startedDate: '2020-01-01',
      defaultStatutoryPaymentMethod: 'BANK_TRANSFER',
      statutoryBankName: 'Central Bank',
      statutoryBankBranch: 'Colombo',
      statutoryBankCode: '7010',
      statutoryBranchCode: '001',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
      files: [],
    };

    const sampleComponents = [
      { id: 'comp-1', name: 'Fixed Allowance', type: 'FLAT_AMOUNT', amount: 15000, category: 'ADDITION', systemType: 'NONE', isStatutory: true, affectsTotalEarnings: true },
      { id: 'comp-2', name: 'Performance Bonus', type: 'FLAT_AMOUNT', amount: 5000, category: 'ADDITION', systemType: 'NONE', isStatutory: false, affectsTotalEarnings: false },
      { id: 'holiday-pay', name: 'Holiday Pay', type: 'FLAT_AMOUNT', amount: 4250, category: 'ADDITION', systemType: 'HOLIDAY_PAY', isStatutory: true, affectsTotalEarnings: true },
      { id: 'epf', name: 'EPF', type: 'PERCENTAGE_TOTAL_EARNINGS', value: 8, amount: 8340, category: 'DEDUCTION', systemType: 'EPF_EMPLOYEE', isStatutory: true, affectsTotalEarnings: true, employerValue: 12, employerAmount: 12510 },
      { id: 'etf', name: 'ETF', type: 'PERCENTAGE_TOTAL_EARNINGS', value: 0, amount: 0, category: 'DEDUCTION', systemType: 'ETF_EMPLOYER', isStatutory: true, affectsTotalEarnings: true, employerValue: 3, employerAmount: 3127.5 },
      { id: 'welfare', name: 'Staff Welfare', type: 'FLAT_AMOUNT', value: 500, amount: 500, category: 'DEDUCTION', systemType: 'NONE', isStatutory: false, affectsTotalEarnings: false },
    ];

    const additionNames = ['Fixed Allowance', 'Performance Bonus', 'Holiday Pay'];
    const deductionNames = ['EPF', 'Staff Welfare'];

    switch (type) {
      case DocumentType.PAYSLIP:
        return {
          company: commonCompany,
          employee: commonEmployee,
          salary: {
            id: 'sal-001',
            month: 3,
            year: 2026,
            periodStartDate: '2026-03-01',
            periodEndDate: '2026-03-31',
            payDate: '2026-03-31',
            basicSalary: 85000,
            otAmount: 2500,
            otBreakdown: [
              { hours: 8, amount: 2000, rate: 250, type: 'NORMAL_OT' },
              { hours: 2, amount: 500, rate: 250, type: 'DOUBLE_OT' }
            ],
            holidayPayAmount: 4250,
            holidayPayBreakdown: [{ hours: 8, amount: 4250, holidayName: 'Public Holiday', affectsTotalEarnings: true }],
            noPayAmount: 0,
            noPayBreakdown: [],
            taxAmount: 0,
            advanceDeduction: 0,
            netSalary: 97910,
            status: 'APPROVED',
            remarks: 'Standard monthly payroll run',
            otAdjustment: 0,
            otAdjustmentReason: '',
            lateDeduction: 0,
            lateAdjustment: 0,
            lateAdjustmentReason: '',
            holidayPayAdjustment: 0,
            holidayPayAdjustmentReason: '',
            recoveryAdjustment: 0,
            recoveryAdjustmentReason: '',
            advanceAdjustments: [],
            // Statutory totals (mapped from components for convenience)
            epfEmployee: 8340,
            epfEmployer: 12510,
            etfEmployer: 3127.5,
            components: sampleComponents,
            additions: sampleComponents.filter(c => c.category === 'ADDITION'),
            deductions: sampleComponents.filter(c => c.category === 'DEDUCTION'),
            approvedById: '00000000-0000-0000-0000-000000000000',
            approvedAt: '2026-03-31T10:00:00Z',
            payments: [
              { id: 'pay-001', amount: 97910, date: '2026-03-31', paymentMethod: 'BANK_TRANSFER', referenceNo: 'TXN123456789', status: 'ACKNOWLEDGED' }
            ],
            createdAt: '2026-03-31T09:00:00Z',
            updatedAt: '2026-03-31T10:00:00Z',
          }
        };

      case DocumentType.SALARY_SHEET: {
        const buildRow = (i: number) => {
          const basic = 60000 + (i * 10000);
          const ot = i % 2 === 0 ? 3000 : 0;
          const holidayPay = 4250;
          const net = basic + ot + holidayPay + 15000 + 5000 + 4250 - (basic * 0.08) - 500;
          
          return {
            employee: { 
              ...commonEmployee, 
              id: `emp-${i}`, 
              employeeNo: `00${i + 1}`, 
              fullName: i % 2 === 0 ? 'JOHN DOE' : 'JANE SMITH',
              designation: i % 2 === 0 ? 'Senior Developer' : 'HR Manager',
              department: { name: i % 2 === 0 ? 'Technology' : 'HR' },
            },
            // Flattened salary fields for worksheet rows to match template access
            id: `sal-${i}`,
            basicSalary: basic,
            netSalary: net,
            otAmount: ot,
            holidayPayAmount: holidayPay,
            noPayAmount: 0,
            epfEmployee: basic * 0.08,
            epfEmployer: basic * 0.12,
            etfEmployer: basic * 0.03,
            payDate: '2026-03-31',
            status: 'APPROVED',
            additionAmounts: {
              "Fixed Allowance": 15000,
              "Performance Bonus": 5000,
              "Holiday Pay": 4250
            },
            deductionAmounts: {
              "EPF": basic * 0.08,
              "Staff Welfare": 500
            },
          };
        };

        const salaries = Array.from({ length: 5 }, (_, i) => buildRow(i));
        return {
          company: commonCompany,
          month: 3,
          year: 2026,
          periodStartDate: '2026-03-01',
          periodEndDate: '2026-03-31',
          additionColumns: additionNames,
          deductionColumns: deductionNames,
          salaries,
          totals: {
            basicSalary: salaries.reduce((s, r) => s + r.basicSalary, 0),
            netSalary: salaries.reduce((s, r) => s + r.netSalary, 0),
            otAmount: salaries.reduce((s, r) => s + r.otAmount, 0),
            epfEmployee: salaries.reduce((s, r) => s + r.epfEmployee, 0),
            epfEmployer: salaries.reduce((s, r) => s + r.epfEmployer, 0),
            etfEmployer: salaries.reduce((s, r) => s + r.etfEmployer, 0),
            holidayPayAmount: salaries.reduce((s, r) => s + r.holidayPayAmount, 0),
            noPayAmount: salaries.reduce((s, r) => s + r.noPayAmount, 0),
            additionAmounts: Object.fromEntries(additionNames.map(n => [n, salaries.reduce((s, r) => s + (r.additionAmounts[n] || 0), 0)])),
            deductionAmounts: Object.fromEntries(deductionNames.map(n => [n, salaries.reduce((s, r) => s + (r.deductionAmounts[n] || 0), 0)])),
          },
        };
      }

      case DocumentType.ATTENDANCE_REPORT:
        return {
          company: commonCompany,
          employee: commonEmployee,
          month: 3,
          year: 2026,
          periodStartDate: '2026-03-01',
          periodEndDate: '2026-03-31',
          logs: Array.from({ length: 5 }, (_, i) => ({
            id: `att-${i}`,
            date: `2026-03-${String(i + 1).padStart(2, '0')}`,
            shiftName: 'Standard Shift',
            shiftStartTime: '09:00',
            shiftEndTime: '17:00',
            checkInTime: `2026-03-${String(i + 1).padStart(2, '0')} 09:10:00`,
            checkOutTime: `2026-03-${String(i + 1).padStart(2, '0')} 17:40:00`,
            totalMinutes: 690,
            workMinutes: 630,
            overtimeMinutes: i % 3 === 0 ? 90 : 0,
            isLate: i % 5 === 0,
            lateMinutes: i % 5 === 0 ? 10 : 0,
            workDayStatus: 'WORKING_DAY',
            inApprovalStatus: 'APPROVED',
            outApprovalStatus: 'APPROVED',
            payrollStatus: 'PROCESSED',
            remarks: 'Perfect attendance',
            shiftBreakMinutes: 60,
            breakMinutes: 60,
            checkInLocation: 'Main Entrance',
            checkOutLocation: 'Main Entrance',
            isEarlyLeave: false,
            earlyLeaveMinutes: 0,
            isOnLeave: false,
            isHalfDay: false,
            hasShortLeave: false,
            autoCheckout: false,
            manuallyEdited: false,
            metadata: {},
            createdAt: `2026-03-${String(i+1).padStart(2, '0')}T09:00:00Z`,
            updatedAt: `2026-03-${String(i+1).padStart(2, '0')}T17:40:00Z`,
          })),
          leaves: [
            { 
              id: 'leave-1', 
              leaveTypeName: 'Annual Leave', 
              type: 'FULL_DAY', 
              startDate: '2026-03-10', 
              endDate: '2026-03-10', 
              days: 1, 
              status: 'APPROVED', 
              reason: 'Personal trip',
              responseReason: 'Enjoy!',
              createdAt: '2026-03-01T10:00:00Z',
              updatedAt: '2026-03-02T09:00:00Z'
            }
          ],
          summary: {
            totalDays: 26,
            workingDays: 22,
            presentDays: 21,
            absentDays: 1,
            lateDays: 3,
            overtimeMinutes: 540,
            leavesTaken: 1,
          },
        };

      case DocumentType.EPF_FORM: {
        const epfSalaries = Array.from({ length: 35 }, (_, i) => {
          const basic = 60000 + i * 10000;
          return {
            employee: {
              ...commonEmployee,
              id: `emp-${i}`,
              employeeNo: `00${i + 1}`,
              fullName: i % 2 === 0 ? 'JOHN DOE' : 'JANE SMITH',
              memberNo: `EPF/MBR/00${i + 1}`,
            },
            id: `sal-${i}`,
            basicSalary: basic,
            grossEarnings: basic + 24250,
            netSalary: basic + 24250 - basic * 0.08 - 500,
            epfEmployee: basic * 0.08,
            epfEmployer: basic * 0.12,
            payDate: '2026-03-31',
            status: 'APPROVED',
          };
        });
        return {
          company: commonCompany,
          month: 3,
          year: 2026,
          periodStartDate: '2026-03-01',
          periodEndDate: '2026-03-31',
          payDate: '2026-03-31',
          epfRecord: {
            id: 'epf-001',
            month: 3,
            year: 2026,
            referenceNo: 'EPF/REF/2026/03/001',
            totalContribution: epfSalaries.reduce((s, r) => s + r.epfEmployee + r.epfEmployer, 0),
            totalEmployeeContribution: epfSalaries.reduce((s, r) => s + r.epfEmployee, 0),
            totalEmployerContribution: epfSalaries.reduce((s, r) => s + r.epfEmployer, 0),
            surcharge: 0,
            paidDate: null,
            paymentMethod: 'BANK_TRANSFER',
            bankName: commonCompany.statutoryBankName,
            bankBranch: commonCompany.statutoryBankBranch,
            bankCode: commonCompany.statutoryBankCode,
            branchCode: commonCompany.statutoryBranchCode,
            chequeNo: null,
            remarks: '',
          },
          salaries: epfSalaries,
          totals: {
            totalEmployeeContribution: epfSalaries.reduce((s, r) => s + r.epfEmployee, 0),
            totalEmployerContribution: epfSalaries.reduce((s, r) => s + r.epfEmployer, 0),
            totalContribution: epfSalaries.reduce((s, r) => s + r.epfEmployee + r.epfEmployer, 0),
          },
        };
      }

      case DocumentType.ETF_FORM: {
        const etfSalaries = Array.from({ length: 5 }, (_, i) => {
          const basic = 60000 + i * 10000;
          return {
            employee: {
              ...commonEmployee,
              id: `emp-${i}`,
              employeeNo: `00${i + 1}`,
              fullName: i % 2 === 0 ? 'JOHN DOE' : 'JANE SMITH',
              memberNo: `ETF/MBR/00${i + 1}`,
            },
            id: `sal-${i}`,
            basicSalary: basic,
            grossEarnings: basic + 24250,
            netSalary: basic + 24250 - basic * 0.08 - 500,
            etfEmployer: basic * 0.03,
            payDate: '2026-03-31',
            status: 'APPROVED',
          };
        });
        return {
          company: commonCompany,
          month: 3,
          year: 2026,
          periodStartDate: '2026-03-01',
          periodEndDate: '2026-03-31',
          payDate: '2026-03-31',
          etfRecord: {
            id: 'etf-001',
            month: 3,
            year: 2026,
            totalContribution: etfSalaries.reduce((s, r) => s + r.etfEmployer, 0),
            surcharge: 0,
            paidDate: null,
            paymentMethod: 'BANK_TRANSFER',
            bankName: commonCompany.statutoryBankName,
            bankBranch: commonCompany.statutoryBankBranch,
            bankCode: commonCompany.statutoryBankCode,
            branchCode: commonCompany.statutoryBranchCode,
            chequeNo: null,
            remarks: '',
          },
          salaries: etfSalaries,
          totals: {
            totalContribution: etfSalaries.reduce((s, r) => s + r.etfEmployer, 0),
          },
        };
      }

      default:
        return {};
    }
  }
}
