import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    registerUser(supabaseUid: string, email: string, dto: RegisterDto): Promise<{
        user: any;
        company?: any;
    }>;
}
