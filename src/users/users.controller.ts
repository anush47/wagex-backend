import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, Request, Logger, ForbiddenException, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { User } from './entities/user.entity';
import { QueryDto } from '../common/dto/query.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) { }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, type: User })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Admin creating user: ${createUserDto.email}`);
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, type: [User] })
  async findAll(@Query() queryDto: QueryDto) {
    return this.usersService.findAll(queryDto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: User })
  async findOne(@Param('id') id: string, @Request() req): Promise<User> {
    const user = req.user;

    // Security check: If not Admin, can only see self
    if (user.role !== Role.ADMIN && user.id !== id) {
      this.logger.warn(`User ${user.id} attempted to access profile of user ${id}`);
      throw new ForbiddenException('You can only access your own profile.');
    }

    return this.usersService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, type: User })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<User> {
    this.logger.log(`Admin updating user ID: ${id}`);
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, type: User })
  async remove(@Param('id') id: string): Promise<User> {
    this.logger.log(`Admin deleting user ID: ${id}`);
    return this.usersService.remove(id);
  }
}
