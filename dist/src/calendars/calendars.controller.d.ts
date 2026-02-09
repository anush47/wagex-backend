import { CalendarsService } from './calendars.service';
import { HolidayQueryDto } from './dto/holiday-query.dto';
export declare class CalendarsController {
    private readonly calendarsService;
    constructor(calendarsService: CalendarsService);
    findAllCalendars(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        name: string;
        isGlobal: boolean;
    }[]>;
    findHolidays(query: HolidayQueryDto): Promise<{
        items: ({
            calendar: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                companyId: string | null;
                description: string | null;
                name: string;
                isGlobal: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            name: string;
            calendarId: string;
            date: Date;
            isPublic: boolean;
            isMercantile: boolean;
            isBank: boolean;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOneCalendar(id: string): Promise<({
        holidays: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            name: string;
            calendarId: string;
            date: Date;
            isPublic: boolean;
            isMercantile: boolean;
            isBank: boolean;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        name: string;
        isGlobal: boolean;
    }) | null>;
}
