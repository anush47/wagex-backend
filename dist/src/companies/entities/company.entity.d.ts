import { Company as PrismaCompany } from '@prisma/client';
import { UserCompany } from '../../users/entities/user-company.entity';
export declare class Company implements PrismaCompany {
    id: string;
    name: string;
    active: boolean;
    memberships?: UserCompany[];
    createdAt: Date;
    updatedAt: Date;
}
