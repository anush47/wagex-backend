import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    registerUser(supabaseUid: string, email: string, dto: RegisterDto): Promise<{
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
