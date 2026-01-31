import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    changePassword(body: any): {
        message: string;
    };
    register(req: any, dto: RegisterDto): Promise<{
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
    } | {
        user: {
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
        };
        company: {
            id: string;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
        };
    }>;
}
