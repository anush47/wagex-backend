import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';
import { DEFAULT_EMPLOYER_PERMISSIONS } from './permissions';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(private readonly prisma: PrismaService) { }

    async registerUser(supabaseUid: string, email: string, dto: RegisterDto): Promise<{ user: any; company?: any }> {
        this.logger.log(`Registering user: ${email} with role: ${dto.role}`);

        // Check for duplicate registration
        const existingUser = await this.prisma.user.findUnique({ where: { id: supabaseUid } });
        if (existingUser) {
            throw new BadRequestException('User already registered.');
        }

        if (dto.role === Role.ADMIN) {
            throw new BadRequestException('Cannot register as ADMIN directly.');
        }

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
                        memberships: {
                            create: {
                                companyId: company.id,
                                role: Role.EMPLOYER,
                                permissions: DEFAULT_EMPLOYER_PERMISSIONS,
                            }
                        }
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

        return { user };
    }
}
