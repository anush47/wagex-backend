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
    this.registerHelpers();
  }

  private registerHelpers() {
    Handlebars.registerHelper('formatCurrency', (value) => {
      if (typeof value !== 'number') return value;
      return new Intl.NumberFormat('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    });

    Handlebars.registerHelper('formatDate', (date, formatStr) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString();
    });

    Handlebars.registerHelper('eq', (a, b) => a === b);

    Handlebars.registerHelper('chunk', (arr: any[], size: number) => {
      if (!Array.isArray(arr)) return [];
      const chunks: any[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    });

    Handlebars.registerHelper('getAmount', (list: any[], name: string) => {
      if (!Array.isArray(list)) return 0;
      const item = list.find((i) => i.name === name);
      return item ? item.amount : 0;
    });

    Handlebars.registerHelper('getCustomTotal', (totalsObj: any, name: string) => {
      if (!totalsObj) return 0;
      return totalsObj[name] || 0;
    });

    Handlebars.registerHelper('add', (a, b) => (a || 0) + (b || 0));
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
    const { companyId: requestedCompanyId, type, isActive } = query;
    const where: any = { type };

    if (isActive !== undefined) {
      where.isActive = isActive;
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
      const isTryingToEditContent = dto.html || dto.css || dto.config || dto.name || dto.description;
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
    const html = template.html;

    const compiledTemplate = Handlebars.compile(html);
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
    const commonVariables = {
      company: {
        name: 'WageX (Pvt) Ltd',
        address: '123 Business Road, Colombo 03',
        phone: '+94 11 234 5678',
        email: 'hello@wagex.com',
        logo: 'https://wagex.com/logo.png',
      },
    };

    switch (type) {
      case DocumentType.PAYSLIP:
        return {
          ...commonVariables,
          employee: {
            id: 'EMP-UUID-001',
            fullName: 'John Doe',
            employeeNo: 'EMP-001',
            memberNo: 'EMP-001',
            nic: '199512345678',
            designation: 'Software Engineer',
            department: { name: 'Engineering' },
            epfNo: '1234/E',
          },
          month: 3,
          year: 2024,
          periodStartDate: '2024-03-01',
          periodEndDate: '2024-03-31',
          payDate: '2024-03-31',
          basicSalary: 120000.0,
          grossSalary: 135000.0,
          netSalary: 115000.0,
          epfEmployee: 9600.0,
          epfEmployer: 14400.0,
          etfEmployer: 3600.0,
          otPay: 10000.0,
          holidayPay: 5000.0,
          noPay: 0.0,
          advanceDeduction: 5000.0,
          lateDeduction: 0.0,
          taxAmount: 5000.0,
          additions: [{ name: 'Travel Allowance', amount: 5000 }],
          deductions: [{ name: 'Medical Insurance', amount: 2000 }],
        };

      case DocumentType.SALARY_SHEET:
        return {
          ...commonVariables,
          month: 3,
          year: 2024,
          additionColumns: ['Travel Allowance', 'Performance Bonus'],
          deductionColumns: ['Medical Insurance', 'Special Fund'],
          salaries: Array.from({ length: 20 }).map((_, i) => ({
            employee: { 
              id: `EMP-UUID-00${i + 1}`,
              fullName: i % 2 === 0 ? 'John Doe' : 'Jane Smith', 
              employeeNo: `EMP-00${i + 1}`,
              memberNo: `EMP-00${i + 1}`,
              nic: `19951234567${i}`,
              designation: i % 2 === 0 ? 'Software Engineer' : 'Product Designer',
              department: { name: i % 2 === 0 ? 'Engineering' : 'Design' }
            },
            basicSalary: 120000.0,
            grossSalary: 135000.0,
            netSalary: 115000.0,
            epfEmployee: 9600.0,
            epfEmployer: 14400.0,
            etfEmployer: 3600.0,
            otPay: 10000.0,
            holidayPay: 5000.0,
            additions: [
              { name: 'Travel Allowance', amount: 5000 },
              { name: 'Performance Bonus', amount: 0 },
            ],
            deductions: [
              { name: 'Medical Insurance', amount: 2000 },
              { name: 'Special Fund', amount: 0 },
            ],
          })),
          totals: {
            basicSalary: 120000.0 * 20,
            grossSalary: 135000.0 * 20,
            netSalary: 115000.0 * 20,
            epfEmployee: 9600.0 * 20,
            epfEmployer: 14400.0 * 20,
            etfEmployer: 3600.0 * 20,
            otPay: 10000.0 * 20,
            holidayPay: 5000.0 * 20,
            customAdditions: { 'Travel Allowance': 5000 * 20, 'Performance Bonus': 0 },
            customDeductions: { 'Medical Insurance': 2000 * 20, 'Special Fund': 0 },
            totalAdditions: 15000.0 * 20,
            totalDeductions: 20000.0 * 20,
          },
        };

      case DocumentType.ATTENDANCE_REPORT:
        return {
          ...commonVariables,
          employee: { 
            id: 'EMP-UUID-001',
            fullName: 'John Doe', 
            employeeNo: 'EMP-001',
            memberNo: 'EMP-001',
            nic: '199512345678',
            designation: 'Software Engineer',
            department: { name: 'Engineering' }
          },
          month: 3,
          year: 2024,
          logs: [
            { date: '2024-03-01', checkIn: '08:00 AM', checkOut: '05:00 PM', status: 'PRESENT' },
            { date: '2024-03-02', checkIn: '08:15 AM', checkOut: '05:10 PM', status: 'PRESENT' },
          ],
        };
      default:
        return {};
    }
  }
}
