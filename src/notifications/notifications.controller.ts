import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto'; // Not exposed in controller for now
import { NotificationQueryDto } from './dto/notification-query.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Post('broadcast')
    @Roles(Role.ADMIN, Role.EMPLOYER)
    @ApiOperation({ summary: 'Broadcast notification (Admin -> All/Role, Employer -> Employees)' })
    broadcast(@Body() body: BroadcastNotificationDto, @Request() req) {
        // Map string type to Enum if provided
        // We use 'as any' casting because DTO uses string unions but Service expects Prisma Enum
        return this.notificationsService.broadcast(
            req.user,
            body.targetRole || null,
            body.title,
            body.message,
            body.userIds,
            body.type as any,
            body.metadata
        );
    }

    @Get()
    @ApiOperation({ summary: 'Get my notifications (Paginated)' })
    findAll(@Request() req, @Query() query: NotificationQueryDto) {
        return this.notificationsService.getUserNotifications(req.user.id, query);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark notification as read' })
    markAsRead(@Param('id') id: string, @Request() req) {
        return this.notificationsService.markAsRead(id, req.user.id);
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Mark all my notifications as read' })
    markAllAsRead(@Request() req) {
        return this.notificationsService.markAllAsRead(req.user.id);
    }
}
