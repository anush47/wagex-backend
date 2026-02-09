import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { CalendarsService } from './calendars.service';
import { HolidayQueryDto } from './dto/holiday-query.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Calendars & Holidays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendars')
export class CalendarsController {
    constructor(private readonly calendarsService: CalendarsService) { }

    @Get()
    @ApiOperation({ summary: 'List all global calendars' })
    findAllCalendars() {
        return this.calendarsService.findAllCalendars();
    }

    @Get('holidays')
    @ApiOperation({ summary: 'List holidays with filtering and pagination' })
    findHolidays(@Query() query: HolidayQueryDto) {
        return this.calendarsService.findHolidays(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific calendar details' })
    findOneCalendar(@Param('id') id: string) {
        return this.calendarsService.findOneCalendar(id);
    }
}
