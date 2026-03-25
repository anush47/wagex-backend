import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto, TemplateQueryDto } from './dto/template.dto';
import * as Handlebars from 'handlebars';
import { DocumentType, TemplateStatus } from '@prisma/client';
import { TemplatesDataService } from './templates-data.service';

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataService: TemplatesDataService,
  ) {
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
  }

  async create(dto: CreateTemplateDto) {
    const finalDto = {
      ...dto,
      status: dto.status || TemplateStatus.DRAFT,
      isActive: false, // Force false on create to prevent bypass
    };
    return this.prisma.documentTemplate.create({
      data: finalDto as any,
    });
  }

  async findAll(query: TemplateQueryDto) {
    const { companyId, type, isActive } = query;
    const where: any = { type };
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.documentTemplate.findMany({
      where: {
        ...where,
        OR: [
          { companyId: null },
          ...(companyId ? [{ companyId }] : []),
        ],
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async update(id: string, dto: UpdateTemplateDto) {
    const template = await this.findOne(id);
    const finalDto = { ...dto };
    const newStatus = dto.status || template.status;
    const newActiveState = dto.isActive !== undefined ? dto.isActive : template.isActive;

    // RULE 1: Approved templates are IMMUTABLE for content
    if (template.status === 'APPROVED') {
      const isTryingToEditContent = dto.html || dto.css || dto.config || dto.name || dto.description;
      if (isTryingToEditContent) {
        throw new BadRequestException('Approved layouts are immutable. Create a copy to make changes.');
      }
    }

    // RULE 2: Only Approved layouts can be Active
    if (newActiveState && newStatus !== 'APPROVED') {
      throw new BadRequestException('Only approved layouts can be activated for production use.');
    }

    // RULE 3: Transition to non-approved always resets activation status
    if (newStatus !== 'APPROVED') {
      finalDto.isActive = false;
    }

    return this.prisma.documentTemplate.update({
      where: { id },
      data: finalDto as any,
    });
  }

  async remove(id: string) {
    return this.prisma.documentTemplate.delete({
      where: { id },
    });
  }

  async render(templateId: string, resourceId: string) {
    const template = await this.findOne(templateId);
    const data = await this.dataService.getData(template.type, resourceId);
    
    const compiledHtml = Handlebars.compile(template.html);
    const renderedHtml = compiledHtml(data);

    return {
      html: renderedHtml,
      css: template.css,
      config: template.config,
      metadata: {
        type: template.type,
        name: template.name,
      }
    };
  }

  async getVariables(type: DocumentType) {
    // Return sample data or a list of available variables for each type
    // This helps the frontend "easy to place" requirement
    switch (type) {
      case DocumentType.PAYSLIP:
        return {
          employee: {
              fullName: "John Doe",
              employeeNo: "EMP-001",
              designation: "Software Engineer",
              department: { name: "Engineering" },
              company: { name: "Wagex Solutions" }
          },
          periodStartDate: "2024-03-01",
          periodEndDate: "2024-03-31",
          basicSalary: 50000.00,
          netSalary: 45000.00,
          components: [
              { name: "EPF 8%", amount: 4000, category: "DEDUCTION" },
              { name: "Travel Allowance", amount: 5000, category: "ADDITION" }
          ]
        };
      case DocumentType.SALARY_SHEET:
        return {
          company: { name: "Wagex Solutions" },
          month: 3,
          year: 2024,
          totals: { basic: 500000, net: 450000, count: 10 },
          salaries: [
            { employee: { fullName: "John Doe", employeeNo: "EMP-001" }, basicSalary: 50000, netSalary: 45000 },
            { employee: { fullName: "Jane Smith", employeeNo: "EMP-002" }, basicSalary: 60000, netSalary: 55000 }
          ]
        };
      case DocumentType.ATTENDANCE_REPORT:
        return {
          employee: { fullName: "John Doe", employeeNo: "EMP-001" },
          month: 3,
          year: 2024,
          logs: [
            { date: "2024-03-01", checkIn: "08:00 AM", checkOut: "05:00 PM", status: "PRESENT" },
            { date: "2024-03-02", checkIn: "08:15 AM", checkOut: "05:10 PM", status: "PRESENT" }
          ]
        };
      default:
        return {};
    }
  }
}
