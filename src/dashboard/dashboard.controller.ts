import { Controller, Get, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import * as RequestWithUserNamespace from '../common/interfaces/request-with-user.interface';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('employer')
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiOperation({ summary: 'Get dashboard stats for employer' })
  async getEmployerStats(@Request() req: RequestWithUserNamespace.RequestWithUser) {
    return this.dashboardService.getEmployerStats(req.user.id);
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get system-wide admin dashboard stats' })
  async getAdminStats() {
    return this.dashboardService.getAdminStats();
  }

  @Get('company/:id')
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiOperation({ summary: 'Get dashboard stats for a specific company' })
  async getCompanyStats(@Request() req: any) {
    const companyId = req.params.id;
    return this.dashboardService.getCompanyDashboardStats(companyId);
  }
}

