import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
export declare class MeController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(req: any): any;
    updateProfile(req: any, updateUserDto: UpdateUserDto): Promise<{
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
