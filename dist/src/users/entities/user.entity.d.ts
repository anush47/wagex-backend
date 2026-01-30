import { Role, User as PrismaUser } from '@prisma/client';
export declare class User implements PrismaUser {
    id: string;
    email: string;
    nameWithInitials: string | null;
    fullName: string | null;
    address: string | null;
    phone: string | null;
    role: Role;
    active: boolean;
    companyId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
