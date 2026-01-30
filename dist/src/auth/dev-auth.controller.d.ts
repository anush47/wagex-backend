import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class DevAuthController {
    private readonly configService;
    private readonly prisma;
    private readonly jwtService;
    constructor(configService: ConfigService, prisma: PrismaService, jwtService: JwtService);
    getDevToken(email: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            nameWithInitials: string | null;
            fullName: string | null;
            address: string | null;
            phone: string | null;
            role: import("@prisma/client").$Enums.Role;
            active: boolean;
            companyId: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
}
