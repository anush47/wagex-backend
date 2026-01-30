import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService) { }

    async registerUser(supabaseUid: string, email: string, dto: RegisterDto) {
        // 1. Handle Employer Registration (Create Company + User)
        if (dto.role === Role.EMPLOYER) {
            const { companyName } = dto;
            if (!companyName) {
                throw new BadRequestException('Company Name is required for Employers.');
            }

            // Transaction: Create Company -> Create User linked to Company
            const result = await this.prisma.$transaction(async (tx) => {
                const company = await tx.company.create({
                    data: { name: companyName },
                });

                const user = await tx.user.create({
                    data: {
                        id: supabaseUid,
                        email,
                        nameWithInitials: dto.nameWithInitials,
                        fullName: dto.fullName,
                        address: dto.address,
                        phone: dto.phone,
                        role: Role.EMPLOYER,
                        companyId: company.id,
                    },
                });

                return { user, company };
            });

            return result;
        }

        // 2. Handle Employee/Admin Registration (Simple User)
        const user = await this.prisma.user.create({
            data: {
                id: supabaseUid,
                email,
                nameWithInitials: dto.nameWithInitials,
                fullName: dto.fullName,
                address: dto.address,
                phone: dto.phone,
                role: dto.role,
            },
        });

        return user;
    }
}
