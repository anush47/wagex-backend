import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Query,
    Delete,
    UseGuards,
    Logger,
    Headers,
    UnauthorizedException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { AttendanceManualService } from './services/attendance-manual.service';
import { AttendanceQueryService } from './services/attendance-query.service';
import { AttendanceExternalService } from './services/attendance-external.service';
import {
    CreateEventDto,
    BulkCreateEventsDto,
} from './dto/event.dto';
import {
    UpdateSessionDto,
    CreateSessionDto,
    SessionQueryDto,
    EventQueryDto,
} from './dto/session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { Role } from '@prisma/client';

// ============================================
// MANUAL ENDPOINTS (Employer Portal - JWT Auth)
// ============================================

@ApiTags('Attendance - Manual')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance/manual')
export class AttendanceManualController {
    private readonly logger = new Logger(AttendanceManualController.name);

    constructor(
        private readonly manualService: AttendanceManualService,
        private readonly queryService: AttendanceQueryService,
    ) { }

    @Post('events')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Create manual attendance event' })
    @ApiResponse({ status: 201, description: 'Event created successfully' })
    async createEvent(@Body() createEventDto: CreateEventDto) {
        this.logger.log(`Creating manual event for employee ${createEventDto.employeeId}`);
        const event = await this.manualService.createManualEvent(createEventDto, 'MANUAL');

        return {
            success: true,
            event: {
                id: event.id,
                employeeId: event.employeeId,
                eventTime: event.eventTime.toISOString(),
                eventType: event.eventType,
                status: event.status,
            },
        };
    }

    @Post('sessions')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Create manual attendance session' })
    async createSession(@Body() dto: CreateSessionDto) {
        return this.manualService.createManualSession(dto);
    }

    @Get('sessions')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Get attendance sessions (paginated)' })
    async getSessions(@Query() query: SessionQueryDto) {
        return this.queryService.getSessions(query);
    }

    @Get('sessions/:id')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Get single attendance session by ID' })
    async getSession(@Param('id') id: string) {
        return this.queryService.getSession(id);
    }

    @Get('sessions/:id/events')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Get events for a specific attendance session' })
    async getSessionEvents(@Param('id') id: string) {
        return this.queryService.getSessionEvents(id);
    }

    @Get('events')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Get attendance events (paginated)' })
    async getEvents(@Query() query: EventQueryDto) {
        return this.queryService.getEvents(query);
    }

    @Patch('sessions/:id')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Update attendance session' })
    async updateSession(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
        return this.manualService.updateSession(id, dto);
    }

    @Delete('sessions/:id')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Delete attendance session' })
    async deleteSession(@Param('id') id: string) {
        return this.manualService.deleteSession(id);
    }

    @Post('events/:eventId/link/:sessionId')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Link an event to a session manually' })
    async linkEventToSession(@Param('eventId') eventId: string, @Param('sessionId') sessionId: string) {
        await this.manualService.linkEventToSession(eventId, sessionId);
        return { success: true };
    }

    @Delete('events/:eventId/link')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Unlink an event from its session' })
    async unlinkEventFromSession(@Param('eventId') eventId: string) {
        await this.manualService.unlinkEventFromSession(eventId);
        return { success: true };
    }
}

// ============================================
// EXTERNAL ENDPOINTS (API Key Auth)
// ============================================

@ApiTags('Attendance - External API')
@Public()
@Controller('attendance/external')
export class AttendanceExternalController {
    private readonly logger = new Logger(AttendanceExternalController.name);

    constructor(private readonly externalService: AttendanceExternalService) { }

    @Get('verify')
    @ApiOperation({ summary: 'Verify API key' })
    @ApiResponse({ status: 200, description: 'API key is valid' })
    @ApiResponse({ status: 401, description: 'Invalid API key' })
    async verifyApiKey(@Headers('x-api-key') apiKey: string) {
        if (!apiKey) throw new UnauthorizedException('API key required');
        const result = await this.externalService.verifyApiKey(apiKey);
        if (!result.valid) throw new UnauthorizedException('Invalid API key');
        return result;
    }

    @Post('event')
    @ApiOperation({ summary: 'Insert single attendance event' })
    async createEvent(@Headers('x-api-key') apiKey: string, @Body() dto: CreateEventDto) {
        if (!apiKey) throw new UnauthorizedException('API key required');
        const verification = await this.externalService.verifyApiKey(apiKey);
        if (!verification.valid || !verification.company || !verification.apiKey) {
            throw new UnauthorizedException('Invalid API key');
        }

        const event = await this.externalService.createExternalEvent(dto, verification as any);
        return {
            success: true,
            event: {
                id: event.id,
                employeeId: event.employeeId,
                employeeName: event.employeeName,
                shiftName: event.shiftName,
                eventTime: event.eventTime.toISOString(),
                eventType: event.eventType,
                status: event.status,
            },
        };
    }

    @Post('events/bulk')
    @ApiOperation({ summary: 'Bulk insert attendance events' })
    async bulkCreateEvents(@Headers('x-api-key') apiKey: string, @Body() dto: BulkCreateEventsDto) {
        if (!apiKey) throw new UnauthorizedException('API key required');
        const verification = await this.externalService.verifyApiKey(apiKey);
        if (!verification.valid || !verification.company || !verification.apiKey) {
            throw new UnauthorizedException('Invalid API key');
        }

        return this.externalService.bulkCreateExternalEvents(dto, verification as any);
    }
}
