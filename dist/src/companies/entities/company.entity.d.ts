import { Company as PrismaCompany } from '@prisma/client';
import { UserCompany } from '../../users/entities/user-company.entity';
export declare class Company implements PrismaCompany {
    id: string;
    name: string;
    active: boolean;
    employerNumber: string | null;
    address: string | null;
    startedDate: Date | null;
    logo: string | null;
    files: any | null;
    calendarId: string | null;
    memberships?: UserCompany[];
    createdAt: Date;
    updatedAt: Date;
}
