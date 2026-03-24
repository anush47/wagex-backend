import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentType } from '@prisma/client';

@Injectable()
export class TemplatesDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getData(type: DocumentType, compositeId: string) {
    const parts = compositeId.split('_');
    
    switch (type) {
      case DocumentType.PAYSLIP:
        return this.getSalaryData(compositeId); // Standard salary ID
      case DocumentType.SALARY_SHEET: {
        const [companyId, month, year] = parts;
        return this.getSalarySheetData(companyId, parseInt(month), parseInt(year));
      }
      case DocumentType.ATTENDANCE_REPORT: {
        const [employeeId, month, year] = parts;
        return this.getAttendanceData(employeeId, parseInt(month), parseInt(year));
      }
      default:
        return {};
    }
  }

  private async getSalaryData(salaryId: string) {
    const salary = await this.prisma.salary.findUnique({
      where: { id: salaryId },
      include: {
        employee: {
          include: {
            details: true,
            department: true,
            company: true,
            policy: true
          }
        },
        payments: true,
        company: true
      }
    });
    if (!salary) throw new NotFoundException('Salary record not found');
    return salary;
  }

  private async getSalarySheetData(companyId: string, month: number, year: number) {
    const salaries = await this.prisma.salary.findMany({
        where: { companyId, month, year },
        include: { employee: true }
    });
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    
    const totals = salaries.reduce((acc, s) => ({
        basic: acc.basic + (s.basicSalary || 0),
        net: acc.net + (s.netSalary || 0),
        count: acc.count + 1
    }), { basic: 0, net: 0, count: 0 });

    return { company, month, year, salaries, totals };
  }

  private async getAttendanceData(employeeId: string, month: number, year: number) {
      const employee = await this.prisma.employee.findUnique({ 
          where: { id: employeeId },
          include: { company: true }
      });
      // In a real system, you'd fetch attendance logs here
      const logs = []; // Placeholder for real logs
      return { employee, month, year, logs };
  }
}
