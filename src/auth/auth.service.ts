import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';

import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerUser(userId: string, email: string, dto: RegisterDto): Promise<{ user: User }> {
    this.logger.log(`Completing profile for user: ${email}. Setting role to EMPLOYER and status to inactive.`);

    // Check if user exists (should exist because of Better Auth)
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      throw new BadRequestException('User not found.');
    }

    // Update user profile - Role is ALWAYS Employer by default for new registrations
    // Account is ALWAYS inactive until admin approval
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nameWithInitials: dto.nameWithInitials,
        fullName: dto.fullName,
        address: dto.address,
        phone: dto.phone,
        role: Role.EMPLOYER, // Force Employer role
        active: false, // Force inactive status
      },
      include: {
        memberships: {
          include: { company: true },
        },
      },
    });

    return { user };
  }
}
