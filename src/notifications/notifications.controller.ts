import { Controller, Get, Post, Body, Patch, Param, Query, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import * as RequestWithUserNamespace from '../common/interfaces/request-with-user.interface';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('broadcast')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'Broadcast notification (Admin -> All/Role, Employer -> Employees)' })
  broadcast(@Body() body: BroadcastNotificationDto, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    // Map string type to Enum if provided
    // We use 'as any' casting because DTO uses string unions but Service expects Prisma Enum
    return this.notificationsService.broadcast(
      req.user,
      body.targetRole || null,
      body.title,
      body.message,
      body.userIds,
      body.type as any,
      body.metadata,
    );
  }

  @Get('sent')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'Get notifications sent by me with per-user read status (Admin/Employer)' })
  getSent(@Request() req: RequestWithUserNamespace.RequestWithUser, @Query() query: NotificationQueryDto) {
    return this.notificationsService.getSentByAdmin(req.user.id, query);
  }

  @Get()
  @ApiOperation({ summary: 'Get my notifications (Paginated)' })
  findAll(@Request() req: RequestWithUserNamespace.RequestWithUser, @Query() query: NotificationQueryDto) {
    return this.notificationsService.getUserNotifications(req.user.id, query);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(@Param('id') id: string, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  markAllAsRead(@Request() req: RequestWithUserNamespace.RequestWithUser) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }
}
