import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from './entities/user.entity';
import { QueryDto } from '../common/dto/query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Creating new user: ${createUserDto.email}`);
    const { id, ...data } = createUserDto;
    return this.prisma.user.create({
      data: {
        id: id || crypto.randomUUID(),
        ...data,
      },
    });
  }

  async findAll(queryDto: QueryDto): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', role, active } = queryDto as any;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { nameWithInitials: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    }
    if (active !== undefined && active !== null) {
      where.active = active === 'true' || active === true;
    }

    // Build orderBy clause
    const orderBy: any = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          image: true,
          nameWithInitials: true,
          fullName: true,
          address: true,
          phone: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          memberships: {
            select: {
              id: true,
              companyId: true,
              role: true,
              active: true,
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data as unknown as User[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        image: true,
        nameWithInitials: true,
        fullName: true,
        address: true,
        phone: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          select: {
            id: true,
            companyId: true,
            role: true,
            active: true,
            permissions: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      this.logger.error(`User not found with ID: ${id}`);
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user as unknown as User;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        image: true,
        nameWithInitials: true,
        fullName: true,
        address: true,
        phone: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          select: {
            id: true,
            companyId: true,
            role: true,
            active: true,
            permissions: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return user as unknown as User | null;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Ensure it exists
    await this.findOne(id);

    this.logger.log(`Updating user ID: ${id}`);
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: string): Promise<User> {
    // Ensure it exists
    await this.findOne(id);

    this.logger.log(`Deleting user ID: ${id}`);
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
