import { Role, UserCompany as PrismaUserCompany } from '@prisma/client';
export declare class UserCompany implements PrismaUserCompany {
    id: string;
    userId: string;
    companyId: string;
    role: Role;
    permissions: any;
    createdAt: Date;
    updatedAt: Date;
}
