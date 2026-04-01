import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Employee } from './entities/employee.entity';
import { QueryDto } from '../common/dto/query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { auth } from '../auth/better-auth';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    this.logger.log(`Creating new employee for company: ${createEmployeeDto.companyId}`);

    const {
      active,
      bankName,
      bankBranch,
      accountNumber,
      mothersName,
      fathersName,
      maritalStatus,
      spouseName,
      nationality,
      emergencyContactName,
      emergencyContactPhone,
      ...dto
    } = createEmployeeDto;

    // Prepare data with proper date handling
    const data: any = {
      ...dto,
      joinedDate: createEmployeeDto.joinedDate ? new Date(createEmployeeDto.joinedDate) : new Date(),
      resignedDate: createEmployeeDto.resignedDate ? new Date(createEmployeeDto.resignedDate) : undefined,
      remark: createEmployeeDto.remark || undefined,
      // Nested create for details
      details: {
        create: {
          bankName,
          bankBranch,
          accountNumber,
          mothersName,
          fathersName,
          maritalStatus: maritalStatus || undefined,
          spouseName,
          nationality,
          emergencyContactName,
          emergencyContactPhone,
        },
      },
    };

    const employee = await this.prisma.employee.create({
      data,
      include: { details: true },
    });
    return employee as unknown as Employee;
  }

  async findAll(companyId?: string, queryDto?: QueryDto, user?: any): Promise<PaginatedResponse<Employee>> {
    const { page = 1, limit = 20, search, sortBy = 'employeeNo', sortOrder = 'asc', status } = queryDto || {};
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Status filter - default excludes DELETED
    if (status && status !== 'ALL') {
      if (typeof status === 'string' && status.includes(',')) {
        where.status = { in: status.split(',') };
      } else {
        where.status = status;
      }
    } else if (!status) {
      // Default: exclude DELETED employees
      where.status = { not: 'DELETED' };
    }

    if (companyId) {
      where.companyId = companyId;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { nameWithInitials: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
      // Try to parse employee number if it's a number
      if (!isNaN(parseInt(search))) {
        where.OR.push({ employeeNo: parseInt(search) });
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        select: {
          id: true,
          employeeNo: true,
          fullName: true,
          nameWithInitials: true,
          email: true,
          phone: true,
          designation: true,
          status: true,
          joinedDate: true,
          basicSalary: true,
          departmentId: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          manager: {
            select: { id: true, fullName: true, employeeNo: true },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return {
      data: items as unknown as Employee[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findMe(userId: string): Promise<Employee> {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      select: {
        id: true,
        employeeNo: true,
        fullName: true,
        nameWithInitials: true,
        email: true,
        phone: true,
        designation: true,
        address: true,
        nic: true,
        status: true,
        basicSalary: true,
        joinedDate: true,
        companyId: true,
        departmentId: true,
        details: {
          select: {
            bankName: true,
            bankBranch: true,
            accountNumber: true,
            maritalStatus: true,
            nationality: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
          },
        },
        department: {
          select: { id: true, name: true },
        },
        company: {
          select: { id: true, name: true, timezone: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee account not linked for user ID ${userId}`);
    }

    return employee as unknown as Employee;
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        details: true,
        department: true,
        manager: {
          select: { id: true, fullName: true, employeeNo: true },
        },
        company: true,
        user: true,
        policy: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee as unknown as Employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    const {
      active,
      bankName,
      bankBranch,
      accountNumber,
      mothersName,
      fathersName,
      maritalStatus,
      spouseName,
      nationality,
      emergencyContactName,
      emergencyContactPhone,
      department, // Ignore relation objects from frontend
      manager, // Ignore relation objects from frontend
      policy, // Ignore relation objects from frontend
      ...dto
    } = updateEmployeeDto;

    // Prepare data
    const data: any = {
      ...dto,
      joinedDate: updateEmployeeDto.joinedDate ? new Date(updateEmployeeDto.joinedDate) : undefined,
      resignedDate: updateEmployeeDto.resignedDate ? new Date(updateEmployeeDto.resignedDate) : undefined,
      // Nested update for details
      details: {
        upsert: {
          create: {
            bankName,
            bankBranch,
            accountNumber,
            mothersName,
            fathersName,
            maritalStatus: maritalStatus || undefined,
            spouseName,
            nationality,
            emergencyContactName,
            emergencyContactPhone,
          },
          update: {
            bankName,
            bankBranch,
            accountNumber,
            mothersName,
            fathersName,
            maritalStatus: maritalStatus || undefined,
            spouseName,
            nationality,
            emergencyContactName,
            emergencyContactPhone,
          },
        },
      },
    };

    try {
      const employee = await this.prisma.employee.update({
        where: { id },
        data,
        include: { details: true },
      });
      return employee as unknown as Employee;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Employee with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    // Soft delete
    await this.prisma.employee.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }

  private generatePassword(length = 12): string {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
  }

  async provisionUser(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.email) throw new BadRequestException('Employee must have an email to provision a user account.');

    const email = employee.email.toLowerCase();
    let tempPassword = '';
    let userId = '';

    // 1. Resolve User ID (Local or Remote)
    const localUser = await this.prisma.user.findUnique({ where: { email } });

    if (localUser) {
      throw new BadRequestException('A user account with this email already exists.');
    } else {
      tempPassword = this.generatePassword();
      try {
        const userData = await auth.api.signUpEmail({
          body: {
            email: email,
            password: tempPassword,
            name: employee.fullName,
          },
        });

        if (!userData || !userData.user) {
          throw new BadRequestException('Failed to create user in auth system.');
        }
        userId = userData.user.id;

        // Update additional fields that Better Auth might not have set in the User table directly via signUpEmail
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            nameWithInitials: employee.nameWithInitials,
            fullName: employee.fullName,
            address: employee.address,
            phone: employee.phone,
            role: Role.EMPLOYEE,
            active: true,
          },
        });
      } catch (error) {
        this.logger.error(`Auth System Create Failed: ${error.message}`);
        throw new BadRequestException(`Failed to create user: ${error.message}`);
      }
    }

    // 3. Link Employee
    await this.prisma.employee.update({
      where: { id },
      data: { userId: userId },
    });

    // 4. Ensure Company Membership
    await this.prisma.userCompany.upsert({
      where: {
        userId_companyId: {
          userId: userId,
          companyId: employee.companyId,
        },
      },
      update: {
        active: true, // Activate membership during provisioning
        role: Role.EMPLOYEE,
      },
      create: {
        userId: userId,
        companyId: employee.companyId,
        role: Role.EMPLOYEE,
        permissions: {},
        active: true, // Active immediately
      },
    });

    return {
      email,
      userId: userId,
      password: tempPassword,
      message: 'User created and linked.',
    };
  }

  async deprovisionUser(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee || !employee.userId) {
      throw new BadRequestException('Employee not linked to a user account.');
    }

    const userId = employee.userId;

    // Remove from auth system (this will cascade to Account and Session in our schema)
    try {
      await this.prisma.user.delete({
        where: { id: userId },
      });
      this.logger.log(`Deleted user account for userId: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete user from database: ${error.message}`);
    }

    // Unlink employee
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { userId: null },
    });

    return { message: 'User deprovisioned and unlinked.' };
  }
}
