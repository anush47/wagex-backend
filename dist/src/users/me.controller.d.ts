import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
export declare class MeController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(req: any): any;
    updateProfile(req: any, updateUserDto: UpdateUserDto): Promise<{
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
