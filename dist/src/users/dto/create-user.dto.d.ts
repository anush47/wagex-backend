import { Role } from '@prisma/client';
export declare class CreateUserDto {
    email: string;
    name: string;
    role: Role;
    companyId?: string;
}
