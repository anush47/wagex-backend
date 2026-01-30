import { Company as PrismaCompany } from '@prisma/client';
export declare class Company implements PrismaCompany {
    id: string;
    name: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
