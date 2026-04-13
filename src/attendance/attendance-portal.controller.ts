import { Controller, Get, Post, Body, Query, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendancePortalService } from './services/attendance-portal.service';
import { SessionQueryDto } from './dto/session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import * as RequestWithUserNamespace from '../common/interfaces/request-with-user.interface';

@ApiTags('Attendance - Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance/portal')
export class AttendancePortalController {
  constructor(private readonly portalService: AttendancePortalService) {}

  @Get('sessions')
  @Roles(Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get current employee attendance log' })
  async getSessions(@Request() req: RequestWithUserNamespace.RequestWithUser, @Query() query: SessionQueryDto) {
    return this.portalService.getEmployeeSessions(req.user.id, req.user.memberships?.[0]?.companyId || '', query);
  }

  @Get('sessions/:id/events')
  @Roles(Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get events for a specific employee attendance session' })
  async getSessionEvents(@Request() req: RequestWithUserNamespace.RequestWithUser, @Param('id') id: string) {
    return this.portalService.getEmployeeSessionEvents(req.user.id, id);
  }

  @Get('status')
  @Roles(Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get current check-in status and portal config' })
  async getStatus(@Request() req: RequestWithUserNamespace.RequestWithUser) {
    return this.portalService.getAttendanceStatus(req.user.id);
  }

  @Post('mark')
  @Roles(Role.EMPLOYEE)
  @ApiOperation({ summary: 'Check-in or Check-out from portal' })
  async markAttendance(
    @Request() req: RequestWithUserNamespace.RequestWithUser,
    @Body() body: { latitude?: number; longitude?: number; remark?: string },
  ) {
    return this.portalService.markAttendance(
      req.user.id,
      req.user.memberships?.[0]?.companyId || '',
      body.latitude && body.longitude ? { latitude: body.latitude, longitude: body.longitude } : undefined,
      body.remark,
    );
  }
}
