import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];

interface HolidayCSVRecord {
    UID: string;
    Summary: string;
    Categories: string;
    Start: string;
    End: string;
}

// --------------------
// Helpers
// --------------------

/**
 * Simple CSV parser that handles quoted fields with commas.
 */
function parseCSV(csvText: string): HolidayCSVRecord[] {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map((h) => h.trim());
    const records: HolidayCSVRecord[] = [];

    // Regex to split by comma ONLY if it's not inside quotes
    const splitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(splitRegex);
        const record = {} as any;

        headers.forEach((header, index) => {
            let value = parts[index] || '';
            value = value.trim();
            // Remove surrounding quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            }
            record[header] = value;
        });

        records.push(record as HolidayCSVRecord);
    }

    return records;
}

function parseCategories(categories: string) {
    const c = categories.toLowerCase();

    return {
        isPublic: c.includes('public'),
        isBank: c.includes('bank'),
        isMercantile: c.includes('mercantile'),
    };
}

function getDatesBetween(start: string, end: string): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    const endDate = new Date(end);

    if (isNaN(current.getTime()) || isNaN(endDate.getTime())) {
        return [];
    }

    while (current < endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

async function fetchCSV(year: number): Promise<string> {
    const url = `https://raw.githubusercontent.com/Dilshan-H/srilanka-holidays/main/csv/${year}.csv`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch CSV for ${year}`);

    return await res.text();
}

async function getOrCreateCalendar(): Promise<string> {
    if (process.env.CALENDAR_ID) {
        const cal = await prisma.calendar.findUnique({
            where: { id: process.env.CALENDAR_ID },
        });
        if (cal) return cal.id;
    }

    const existing = await prisma.calendar.findFirst({
        where: {
            name: 'Sri Lanka Standard',
            isGlobal: true,
        },
    });

    if (existing) return existing.id;

    console.log('✨ Creating "Sri Lanka Standard" global calendar...');
    const created = await prisma.calendar.create({
        data: {
            name: 'Sri Lanka Standard',
            description: 'Default holidays for Sri Lanka',
            isGlobal: true,
        },
    });

    return created.id;
}

// --------------------
// MAIN
// --------------------
async function main() {
    console.log('🚀 Starting holiday seeding...');

    try {
        const calendarId = await getOrCreateCalendar();
        console.log(`📅 Using Calendar ID: ${calendarId}`);

        let totalInserted = 0;

        for (const year of YEARS) {
            console.log(`📅 Processing ${year}...`);

            const csvText = await fetchCSV(year);
            const records = parseCSV(csvText);

            const data: Prisma.HolidayCreateManyInput[] = [];

            for (const row of records) {
                const dates = getDatesBetween(row.Start, row.End);
                const flags = parseCategories(row.Categories || '');

                for (const date of dates) {
                    data.push({
                        calendarId,
                        date,
                        name: row.Summary,
                        description: row.UID || null,
                        isPublic: flags.isPublic,
                        isBank: flags.isBank,
                        isMercantile: flags.isMercantile,
                        affectTotalEarnings: true,
                    });
                }
            }

            if (data.length > 0) {
                const result = await prisma.holiday.createMany({
                    data,
                    skipDuplicates: true,
                });
                console.log(`✅ ${year}: inserted ${result.count} holidays.`);
                totalInserted += result.count;
            } else {
                console.log(`⚠️ ${year}: No holidays found in CSV.`);
            }
        }

        console.log(`\n🎉 Done. Total inserted: ${totalInserted}`);
    } catch (error) {
        console.error('❌ Error seeding holidays:', error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});