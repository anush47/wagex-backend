import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(createUserDto: CreateUserDto): Promise<{
        email: string;
        role: import("@prisma/client").$Enums.Role;
        companyId: string | null;
        id: string;
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<{
        email: string;
        role: import("@prisma/client").$Enums.Role;
        companyId: string | null;
        id: string;
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        email: string;
        role: import("@prisma/client").$Enums.Role;
        companyId: string | null;
        id: string;
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    findOneByEmail(email: string): Promise<{
        email: string;
        role: import("@prisma/client").$Enums.Role;
        companyId: string | null;
        id: string;
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<{
        email: string;
        role: import("@prisma/client").$Enums.Role;
        companyId: string | null;
        id: string;
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        email: string;
        role: import("@prisma/client").$Enums.Role;
        companyId: string | null;
        id: string;
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
