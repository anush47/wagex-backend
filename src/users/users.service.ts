import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Creating new user: ${createUserDto.email}`);
    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      include: {
        memberships: {
          include: { company: true }
        }
      }
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: { company: true }
        }
      }
    });

    if (!user) {
      this.logger.error(`User not found with ID: ${id}`);
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { company: true }
        }
      }
    });
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
