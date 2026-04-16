import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { EmployerDashboardDto } from './dto/employer-dashboard.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getEmployerStats(userId: string): Promise<EmployerDashboardDto> {
    this.logger.log(`Fetching employer stats for user ${userId}`);

    // Get the user to check role
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    let companyIds: string[] = [];

    if (user?.role === Role.ADMIN) {
      this.logger.log(`Admin user ${userId} accessing global stats`);
      const allCompanies = await this.prisma.company.findMany({
        where: { active: true },
        select: { id: true },
        take: 100, // Balanced limit for dashboard view
      });
      companyIds = allCompanies.map((c) => c.id);
    } else {
      const memberships = await this.prisma.userCompany.findMany({
        where: { userId, role: Role.EMPLOYER, active: true },
        select: { companyId: true },
      });
      companyIds = memberships.map((m) => m.companyId);
    }

    if (companyIds.length === 0) {
      return this.getEmptyStats();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      companiesCount,
      employeesCount,
      pendingLeavesCount,
      todaySessions,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.company.count({ where: { id: { in: companyIds }, active: true } }),
      this.prisma.employee.count({ where: { companyId: { in: companyIds }, status: 'ACTIVE' } }),
      this.prisma.leaveRequest.count({ where: { companyId: { in: companyIds }, status: 'PENDING' } }),
      this.prisma.attendanceSession.findMany({
        where: {
          companyId: { in: companyIds },
          date: today,
        },
        select: {
          checkInTime: true,
          isLate: true,
        },
      }),
      this.prisma.auditLog.findMany({
        where: { companyId: { in: companyIds } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          entity: true,
          details: true,
          createdAt: true,
          resourceId: true,
        },
      }),
    ]);

    // Attendance breakdown
    const present = todaySessions.filter((s) => s.checkInTime).length;
    const late = todaySessions.filter((s) => s.isLate).length;
    const absent = Math.max(0, employeesCount - present);

    return {
      companiesCount,
      employeesCount,
      pendingLeavesCount,
      attendance: {
        present,
        late,
        absent,
        total: employeesCount,
      },
      recentActivity: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        details: this.formatAuditDetails(log),
        createdAt: log.createdAt,
        type: this.mapEntityToType(log.entity || ''),
      })),
    };
  }

  private getEmptyStats(): EmployerDashboardDto {
    return {
      companiesCount: 0,
      employeesCount: 0,
      pendingLeavesCount: 0,
      attendance: { present: 0, late: 0, absent: 0, total: 0 },
      recentActivity: [],
    };
  }

  private mapEntityToType(entity: string): any {
    if (!entity) return 'COMPANY';
    const e = entity.toUpperCase();
    if (e.includes('EMPLOYEE')) return 'EMPLOYEE';
    if (e.includes('LEAVE')) return 'LEAVE';
    if (e.includes('SALARY') || e.includes('PAYROLL') || e.includes('PAYMENT')) return 'PAYROLL';
    return 'COMPANY';
  }

  private formatAuditDetails(log: any): string {
    if (log.details && typeof log.details === 'object' && log.details.message) {
      return log.details.message;
    }
    return `${log.action} on ${log.entity || 'resource'}`;
  }
}
