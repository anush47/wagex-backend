import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(private readonly prisma: PrismaService) { }

    async registerUser(supabaseUid: string, email: string, dto: RegisterDto): Promise<{ user: any; company?: any }> {
        this.logger.log(`Registering user: ${email} with role: ${Role.EMPLOYER}`);

        // Check for duplicate registration
        const existingUser = await this.prisma.user.findUnique({ where: { id: supabaseUid } });
        if (existingUser) {
            throw new BadRequestException('User already registered.');
        }

        if (dto.role === Role.ADMIN) {
            throw new BadRequestException('Cannot register as ADMIN directly.');
        }

        // Create user
        const user = await this.prisma.user.create({
            data: {
                id: supabaseUid,
                email,
                nameWithInitials: dto.nameWithInitials,
                fullName: dto.fullName,
                address: dto.address,
                phone: dto.phone,
                role: Role.EMPLOYER,
                active: false, // Defaulting to false as requested (requires approval/activation)
            },
        });

        return { user };
    }
}
