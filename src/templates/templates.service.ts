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
      id: 'b7e20354-6638-469f-80bd-2d5e308008a4',
      employeeNo: '1',
      nic: '195675675758',
      nameWithInitials: 'ANUSH',
      fullName: 'ANUSHANGA SHARADA GALA',
      designation: 'SSE',
      address: '238/1, Thunandahena, Korathota, Kaduwela.',
      phone: '+94717539478',
      email: '',
      employmentType: 'PERMANENT',
      joinedDate: '2026-04-01',
      gender: 'MALE',
      status: 'ACTIVE',
      basicSalary: 30000,
      department: { name: 'Engineering' },
      details: {
        bankName: '',
        bankBranch: '',
        accountNumber: '',
        maritalStatus: 'SINGLE',
        nationality: 'Sri Lankan',
        emergencyContactName: '',
        emergencyContactPhone: '',
      },
    };

    const commonCompany = {
      id: 'c1512d1b-9359-4e8b-b140-c9496a946ca1',
      name: 'AKURU COLOUR GRAPHICS',
      address: '473, Athurugiriya Rd., Malabe.',
      phone: '+94 11 234 5678',
      email: 'info@akuru.lk',
      logo: '',
      timezone: 'Asia/Colombo',
      employerNumber: 'X/12345',
    };

    const sampleComponents = [
      { id: 'incentive', name: 'Incentive', type: 'FLAT_AMOUNT', amount: 1000, category: 'ADDITION', systemType: 'NONE', isStatutory: false },
      { id: 'holiday-pay', name: 'Holiday Pay', type: 'FLAT_AMOUNT', amount: 2625, category: 'ADDITION', systemType: 'HOLIDAY_PAY', isStatutory: true },
      { id: 'epf', name: 'EPF', type: 'PERCENTAGE_TOTAL_EARNINGS', value: 8, amount: 770, category: 'DEDUCTION', systemType: 'EPF_EMPLOYEE', isStatutory: true, employerValue: 12, employerAmount: 1155 },
      { id: 'etf', name: 'ETF', type: 'PERCENTAGE_TOTAL_EARNINGS', value: 0, amount: 0, category: 'DEDUCTION', systemType: 'ETF_EMPLOYER', isStatutory: true, employerValue: 3, employerAmount: 288.75 },
      { id: 'welfare', name: 'Welfare', type: 'FLAT_AMOUNT', value: 250, amount: 250, category: 'DEDUCTION', systemType: 'NONE', isStatutory: false },
    ];

    const additionNames = ['Incentive', 'Holiday Pay'];
    const deductionNames = ['EPF', 'ETF', 'Welfare'];

    switch (type) {
      case DocumentType.PAYSLIP:
        return {
          company: commonCompany,
          employee: commonEmployee,
          month: 3,
          year: 2026,
          periodStartDate: '2026-03-01',
          periodEndDate: '2026-03-31',
          payDate: '2026-03-31',
          basicSalary: 30000,
          netSalary: 30000,
          otAmount: 0,
          holidayPayAmount: 2625,
          noPayAmount: 23000,
          taxAmount: 0,
          advanceDeduction: 0,
          lateDeduction: 0,
          epfEmployee: 770,
          epfEmployer: 1155,
          etfEmployer: 288.75,
          components: sampleComponents,
          additions: sampleComponents.filter(c => c.category === 'ADDITION'),
          deductions: sampleComponents.filter(c => c.category === 'DEDUCTION'),
          otBreakdown: [],
          holidayPayBreakdown: [{ hours: 10.5, amount: 2625, holidayName: 'Off Day OT' }],
          noPayBreakdown: [
            { type: 'ABSENCE', count: 23, amount: 23000, reason: 'Absence without leave' },
          ],
        };

      case DocumentType.SALARY_SHEET: {
        const buildRow = (i: number) => ({
          employee: { ...commonEmployee, id: `emp-${i}`, employeeNo: String(i + 1), fullName: i % 2 === 0 ? 'ANUSHANGA SHARADA GALA' : 'JANE SMITH PERERA' },
          basicSalary: 30000 + i * 5000,
          netSalary: 28000 + i * 5000,
          otAmount: i % 3 === 0 ? 2500 : 0,
          holidayPayAmount: i % 2 === 0 ? 2625 : 0,
          noPayAmount: i % 4 === 0 ? 1000 : 0,
          epfEmployee: (30000 + i * 5000) * 0.08,
          epfEmployer: (30000 + i * 5000) * 0.12,
          etfEmployer: (30000 + i * 5000) * 0.03,
          additionAmounts: Object.fromEntries(additionNames.map((n, j) => [n, j === 0 ? 1000 : 2625 * (i % 2)])),
          deductionAmounts: Object.fromEntries(deductionNames.map(n => [n, n === 'EPF' ? (30000 + i * 5000) * 0.08 : n === 'ETF' ? (30000 + i * 5000) * 0.03 : 250])),
        });
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
          })),
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
