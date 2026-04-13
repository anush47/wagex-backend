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
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get dashboard stats for employer' })
  async getEmployerStats(@Request() req: RequestWithUserNamespace.RequestWithUser) {
    return this.dashboardService.getEmployerStats(req.user.id);
  }
}
