import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(createUserDto: CreateUserDto): Promise<{
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        active: boolean;
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
    }>;
    findAll(): Promise<{
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        active: boolean;
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
    }[]>;
    findOne(id: string): Promise<{
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        active: boolean;
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
    } | null>;
    findOneByEmail(email: string): Promise<{
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        active: boolean;
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
    } | null>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<{
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        active: boolean;
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
    }>;
    remove(id: string): Promise<{
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        active: boolean;
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
    }>;
}
