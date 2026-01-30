import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
export declare class MeController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(req: any): any;
    updateProfile(req: any, updateUserDto: UpdateUserDto): Promise<{
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
