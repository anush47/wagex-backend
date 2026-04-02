import { Injectable, NotFoundException, BadRequestException, OnModuleInit, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto, TemplateQueryDto } from './dto/template.dto';
import * as Handlebars from 'handlebars';
import { DocumentType, TemplateStatus } from '@prisma/client';
import { TemplatesDataService } from './templates-data.service';

@Injectable()
export class TemplatesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataService: TemplatesDataService,
  ) {}

  onModuleInit() {
    this.registerHelpers(Handlebars);
  }

  private registerHelpers(instance: typeof Handlebars) {
    // Standard helpers are now defined in the 'helpers' field of each template.
    // This allows full customization per-template without backend redeployments.
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

  async render(templateId: string, resourceId: string, query: any = {}) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

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
      department: { name: 'Technology' },
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
      statutoryBankName: 'Central Bank',
      statutoryBankBranch: 'Colombo',
      statutoryBankCode: '7010',
      statutoryBranchCode: '001',
    };

    const sampleComponents = [
      { id: 'comp-1', name: 'Fixed Allowance', type: 'FLAT_AMOUNT', amount: 15000, category: 'ADDITION', systemType: 'NONE', isStatutory: true },
      { id: 'comp-2', name: 'Performance Bonus', type: 'FLAT_AMOUNT', amount: 5000, category: 'ADDITION', systemType: 'NONE', isStatutory: false },
      { id: 'holiday-pay', name: 'Holiday Pay', type: 'FLAT_AMOUNT', amount: 4250, category: 'ADDITION', systemType: 'HOLIDAY_PAY', isStatutory: true },
      { id: 'epf', name: 'EPF', type: 'PERCENTAGE_TOTAL_EARNINGS', value: 8, amount: 8340, category: 'DEDUCTION', systemType: 'EPF_EMPLOYEE', isStatutory: true, employerValue: 12, employerAmount: 12510 },
      { id: 'etf', name: 'ETF', type: 'PERCENTAGE_TOTAL_EARNINGS', value: 0, amount: 0, category: 'DEDUCTION', systemType: 'ETF_EMPLOYER', isStatutory: true, employerValue: 3, employerAmount: 3127.5 },
      { id: 'welfare', name: 'Staff Welfare', type: 'FLAT_AMOUNT', value: 500, amount: 500, category: 'DEDUCTION', systemType: 'NONE', isStatutory: false },
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
            otBreakdown: [{ hours: 10, amount: 2500, rate: 250, type: 'NORMAL_OT' }],
            holidayPayAmount: 4250,
            holidayPayBreakdown: [{ hours: 8, amount: 4250, holidayName: 'Public Holiday' }],
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
            remarks: '',
            metadata: {},
          })),
          leaves: [
            { id: 'leave-1', leaveTypeName: 'Annual Leave', type: 'FULL_DAY', startDate: '2026-03-10', endDate: '2026-03-10', days: 1, status: 'APPROVED', reason: 'Personal' }
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

      default:
        return {};
    }
  }
}
