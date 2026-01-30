import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    changePassword(body: any): {
        message: string;
    };
    register(req: any, dto: RegisterDto): Promise<{
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
    } | {
        user: {
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
        };
        company: {
            name: string;
            id: string;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
}
