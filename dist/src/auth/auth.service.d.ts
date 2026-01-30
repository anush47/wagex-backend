import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    registerUser(supabaseUid: string, email: string, dto: RegisterDto): Promise<{
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
            companyId: string | null;
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
