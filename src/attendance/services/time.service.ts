import { Injectable } from '@nestjs/common';
import { formatInTimeZone, toDate, toZonedTime } from 'date-fns-tz';

@Injectable()
export class TimeService {
    /**
     * Converts a time string (HH:mm) and a reference date in a specific timezone 
     * to a UTC Date object.
     */
    parseTimeWithTimezone(timeStr: string, referenceDate: Date, timezone: string): Date {
        const datePart = formatInTimeZone(referenceDate, timezone, 'yyyy-MM-dd');
        const dateTimeStr = `${datePart} ${timeStr}:00`;
        return toDate(dateTimeStr, { timeZone: timezone });
    }

    /**
     * Gets the start of the day in UTC for a specific date relative to a timezone.
     */
    getStartOfDayInTimezone(date: Date, timezone: string): Date {
        const zonedDateStr = formatInTimeZone(date, timezone, 'yyyy-MM-dd 00:00:00');
        return toDate(zonedDateStr, { timeZone: timezone });
    }

    /**
     * Gets the end of the day in UTC for a specific date relative to a timezone.
     */
    getEndOfDayInTimezone(date: Date, timezone: string): Date {
        const zonedDateStr = formatInTimeZone(date, timezone, 'yyyy-MM-dd 23:59:59.999');
        return toDate(zonedDateStr, { timeZone: timezone });
    }

    /**
     * Determines the "logical date" for an event in a specific timezone.
     * Returns a UTC date at 00:00:00 for that local day.
     */
    getLogicalDate(date: Date, timezone: string): Date {
        const zonedDateStr = formatInTimeZone(date, timezone, 'yyyy-MM-dd');
        return new Date(`${zonedDateStr}T00:00:00Z`);
    }

    /**
     * Formats a date to a string in a specific timezone.
     */
    formatToTimezone(date: Date, timezone: string, formatStr: string = 'yyyy-MM-dd HH:mm:ss'): string {
        return formatInTimeZone(date, timezone, formatStr);
    }

    /**
     * Returns a Date object adjusted to the target timezone's local time.
     */
    getZonedTime(date: Date, timezone: string): Date {
        return toZonedTime(date, timezone);
    }
}
