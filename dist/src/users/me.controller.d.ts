import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
export declare class MeController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(req: any): any;
    updateProfile(req: any, updateUserDto: UpdateUserDto): Promise<{
        email: string;
        name: string | null;
        role: import("@prisma/client").$Enums.Role;
        companyId: string | null;
        active: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
