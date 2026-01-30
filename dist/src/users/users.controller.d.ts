import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto): Promise<{
        id: string;
        email: string;
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        role: import("@prisma/client").$Enums.Role;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
    }>;
    findAll(): Promise<{
        id: string;
        email: string;
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        role: import("@prisma/client").$Enums.Role;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        email: string;
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        role: import("@prisma/client").$Enums.Role;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
    } | null>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<{
        id: string;
        email: string;
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        role: import("@prisma/client").$Enums.Role;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        email: string;
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        role: import("@prisma/client").$Enums.Role;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
    }>;
}
