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
    ApiHeader,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import {
    CreateEventDto,
    BulkCreateEventsDto,
    EventResponseDto,
    BulkEventResponseDto,
} from './dto/event.dto';
import {
    UpdateSessionDto,
    SessionQueryDto,
    EventQueryDto,
} from './dto/session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
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

    constructor(private readonly attendanceService: AttendanceService) { }

    @Post('events')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Create manual attendance event' })
    @ApiResponse({ status: 201, description: 'Event created successfully' })
    async createEvent(@Body() createEventDto: CreateEventDto) {
        this.logger.log(
            `Creating manual event for employee ${createEventDto.employeeId}`,
        );
        const event = await this.attendanceService.createManualEvent(
            createEventDto,
            'MANUAL',
        );

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

    @Get('sessions')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Get attendance sessions (paginated)' })
    @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
    async getSessions(@Query() query: SessionQueryDto) {
        this.logger.log(`Fetching sessions with filters: ${JSON.stringify(query)}`);
        return this.attendanceService.getSessions(query);
    }

    @Get('events')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Get attendance events (paginated)' })
    @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
    async getEvents(@Query() query: EventQueryDto) {
        this.logger.log(`Fetching events with filters: ${JSON.stringify(query)}`);
        return this.attendanceService.getEvents(query);
    }

    @Patch('sessions/:id')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Update attendance session' })
    @ApiResponse({ status: 200, description: 'Session updated successfully' })
    async updateSession(
        @Param('id') id: string,
        @Body() updateSessionDto: UpdateSessionDto,
    ) {
        this.logger.log(`Updating session ${id}`);
        return this.attendanceService.updateSession(id, updateSessionDto);
    }

    @Delete('sessions/:id')
    @Roles(Role.EMPLOYER, Role.ADMIN)
    @ApiOperation({ summary: 'Delete attendance session' })
    @ApiResponse({ status: 200, description: 'Session deleted successfully' })
    async deleteSession(@Param('id') id: string) {
        this.logger.log(`Deleting session ${id}`);
        return this.attendanceService.deleteSession(id);
    }
}

// ============================================
// EXTERNAL ENDPOINTS (API Key Auth)
// ============================================

@ApiTags('Attendance - External API')
@Controller('attendance/external')
export class AttendanceExternalController {
    private readonly logger = new Logger(AttendanceExternalController.name);

    constructor(private readonly attendanceService: AttendanceService) { }

    /**
     * Verify API key
     */
    @Get('verify')
    @ApiHeader({ name: 'X-API-Key', required: true })
    @ApiOperation({ summary: 'Verify API key' })
    @ApiResponse({ status: 200, description: 'API key is valid' })
    @ApiResponse({ status: 401, description: 'Invalid API key' })
    async verifyApiKey(@Headers('x-api-key') apiKey: string) {
        this.logger.log('Verifying API key');

        if (!apiKey) {
            throw new UnauthorizedException('API key required');
        }

        const result = await this.attendanceService.verifyApiKey(apiKey);

        if (!result.valid) {
            throw new UnauthorizedException('Invalid API key');
        }

        return result;
    }

    /**
     * Insert single event
     */
    @Post('event')
    @ApiHeader({ name: 'X-API-Key', required: true })
    @ApiOperation({ summary: 'Insert single attendance event' })
    @ApiResponse({ status: 201, description: 'Event created successfully' })
    @ApiResponse({ status: 401, description: 'Invalid API key' })
    async createEvent(
        @Headers('x-api-key') apiKey: string,
        @Body() createEventDto: CreateEventDto,
    ) {
        this.logger.log(`Creating external event via API key`);

        if (!apiKey) {
            throw new UnauthorizedException('API key required');
        }

        // Verify API key
        const verification = await this.attendanceService.verifyApiKey(apiKey);
        if (!verification.valid) {
            throw new UnauthorizedException('Invalid API key');
        }

        // Create event
        const event = await this.attendanceService.createExternalEvent(
            createEventDto,
            verification.company.id,
            verification.apiKey.name,
        );

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

    /**
     * Bulk insert events
     */
    @Post('events/bulk')
    @ApiHeader({ name: 'X-API-Key', required: true })
    @ApiOperation({ summary: 'Bulk insert attendance events' })
    @ApiResponse({ status: 201, description: 'Events processed' })
    @ApiResponse({ status: 401, description: 'Invalid API key' })
    async bulkCreateEvents(
        @Headers('x-api-key') apiKey: string,
        @Body() bulkCreateDto: BulkCreateEventsDto,
    ) {
        this.logger.log(
            `Bulk creating ${bulkCreateDto.events.length} events via API key`,
        );

        if (!apiKey) {
            throw new UnauthorizedException('API key required');
        }

        // Verify API key
        const verification = await this.attendanceService.verifyApiKey(apiKey);
        if (!verification.valid) {
            throw new UnauthorizedException('Invalid API key');
        }

        // Bulk create events
        return this.attendanceService.bulkCreateExternalEvents(
            bulkCreateDto,
            verification.company.id,
            verification.apiKey.name,
        );
    }
}
