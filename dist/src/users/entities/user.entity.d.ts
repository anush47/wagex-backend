import { Role, User as PrismaUser } from '@prisma/client';
import { UserCompany } from './user-company.entity';
export declare class User implements PrismaUser {
    id: string;
    email: string;
    nameWithInitials: string | null;
    fullName: string | null;
    address: string | null;
    phone: string | null;
    role: Role;
    active: boolean;
    memberships?: UserCompany[];
    createdAt: Date;
    updatedAt: Date;
}
