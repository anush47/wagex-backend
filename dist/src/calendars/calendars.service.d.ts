import { PrismaService } from '../prisma/prisma.service';
import { HolidayQueryDto } from './dto/holiday-query.dto';
export declare class CalendarsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
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
            isPublic: boolean;
            description: string | null;
            name: string;
            calendarId: string;
            date: Date;
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
    findAllCalendars(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        description: string | null;
        name: string;
        isGlobal: boolean;
    }[]>;
    findOneCalendar(id: string): Promise<({
        holidays: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isPublic: boolean;
            description: string | null;
            name: string;
            calendarId: string;
            date: Date;
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
