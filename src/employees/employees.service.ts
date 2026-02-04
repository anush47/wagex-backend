import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Employee } from './entities/employee.entity';
import { QueryDto } from '../common/dto/query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { Role, User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);
  private supabaseAdmin: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && serviceRoleKey) {
      this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    } else {
      this.logger.warn('Supabase Admin credentials missing. User provisioning will be disabled.');
    }
  }

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    this.logger.log(`Creating new employee for company: ${createEmployeeDto.companyId}`);

    // Prepare data with proper date handling
    const data: any = {
      ...createEmployeeDto,
      // Convert joinedDate string to DateTime if provided
      joinedDate: createEmployeeDto.joinedDate
        ? new Date(createEmployeeDto.joinedDate)
        : new Date(),
      // Only include resignedDate if it's not empty
      resignedDate: createEmployeeDto.resignedDate
        ? new Date(createEmployeeDto.resignedDate)
        : undefined,
      // Only include remark if it's not empty
      remark: createEmployeeDto.remark || undefined,
    };

    const employee = await this.prisma.employee.create({ data });
    return employee as unknown as Employee;
  }

  async findAll(companyId?: string, queryDto?: QueryDto, user?: any): Promise<PaginatedResponse<Employee>> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'employeeNo',
      sortOrder = 'asc',
      status = 'ACTIVE'
    } = queryDto || {};
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Status filtering logic
    if (status && status.toUpperCase() !== 'ALL') {
      where.status = status.toUpperCase();
    }

    if (companyId) {
      // If specific company requested, filter by it
      where.companyId = companyId;

      // Security check for Employers: ensuring they only see their own companies
      if (user && user.role === Role.EMPLOYER) {
        const hasAccess = user.memberships?.some(m => m.companyId === companyId);
        if (!hasAccess) {
          this.logger.warn(`Unauthorized access attempt by Employer ${user.id} for company ${companyId}`);
          return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
        }
      }
    } else if (user) {
      // If no companyId, determine access based on role
      if (user.role === Role.EMPLOYER) {
        // Multi-tenant: show all employees from all companies this employer manages
        const accessibleCompanyIds = user.memberships?.map(m => m.companyId) || [];
        if (accessibleCompanyIds.length === 0) {
          return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
        }
        where.companyId = { in: accessibleCompanyIds };
      }
      // Admins see all (where clause remains empty)
    } else {
      // No ID and no user context -> fallback to empty (should not happen with guards)
      this.logger.warn('findAll called without companyId and without user context');
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    if (search) {
      const isNumericSearch = !isNaN(Number(search));
      where.OR = [
        ...(isNumericSearch ? [{ employeeNo: Number(search) }] : []),
        { nameWithInitials: { contains: search, mode: 'insensitive' as const } },
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { nic: { contains: search, mode: 'insensitive' as const } },
        { designation: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          company: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      this.prisma.employee.count({ where })
    ]);

    return {
      data: data as unknown as Employee[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findMe(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      include: {
        company: true,
        user: true,
      },
    });

    if (!employee) {
      throw new ForbiddenException('Employee record not found for this user.');
    }

    return employee;
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: true, // Include linked user to access active status
        company: true
      }
    });

    if (!employee) {
      this.logger.error(`Employee not found with ID: ${id}`);
      throw new NotFoundException(`Employee with ID "${id}" not found`);
    }

    return employee as unknown as Employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    // Ensure it exists first
    await this.findOne(id);

    // Filter out fields that shouldn't be updated or cause issues
    // active is now handled via the User relation
    const { companyId, active, ...updateData } = updateEmployeeDto;

    this.logger.log(`Updating employee ID: ${id}`);
    const updated = await this.prisma.employee.update({
      where: { id },
      data: updateData as any,
    });

    // If active status or other profile fields are toggled, update User record
    if (updated.userId) {
      const userUpdate: any = {};
      if (active !== undefined) userUpdate.active = active as boolean;

      // Auto-deactivate portal access if employee status is not ACTIVE
      if (updateData.status && updateData.status !== 'ACTIVE') {
        userUpdate.active = false;
      }

      if (updateData.address !== undefined) userUpdate.address = updateData.address;
      if (updateData.phone !== undefined) userUpdate.phone = updateData.phone;
      if (updateData.fullName !== undefined) userUpdate.fullName = updateData.fullName;
      if (updateData.nameWithInitials !== undefined) userUpdate.nameWithInitials = updateData.nameWithInitials;

      if (Object.keys(userUpdate).length > 0) {
        await this.prisma.user.update({
          where: { id: updated.userId },
          data: userUpdate
        });
      }

      // Also sync to UserCompany active state if active changed
      if (active !== undefined && updated.companyId) {
        await this.prisma.userCompany.updateMany({
          where: { userId: updated.userId, companyId: updated.companyId },
          data: { active: active as boolean }
        });
      }
    }

    return updated as unknown as Employee;
  }

  async remove(id: string): Promise<Employee> {
    // Ensure it exists first
    await this.findOne(id);

    this.logger.log(`Deleting employee ID: ${id}`);
    const deleted = await this.prisma.employee.delete({
      where: { id },
    });
    return deleted as unknown as Employee;
  }

  /**
   * Generates a random secure password.
   */
  private generatePassword(length = 12): string {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
  }

  /**
   * Provisions a user account for an existing employee.
   */
  async provisionUser(id: string): Promise<{ email: string; userId: string; password?: string; message: string }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.companyId) throw new BadRequestException('Employee not assigned to a company');
    if (employee.userId) throw new BadRequestException('Employee is already linked to a user account.');

    const email = employee.email;
    if (!email) throw new BadRequestException('Employee does not have an email address.');

    let supabaseUid: string;
    let tempPassword: string | undefined;

    // 1. Resolve User ID (Local or Remote)
    // 1. Resolve User ID (Local or Remote)
    const localUser = await this.prisma.user.findUnique({ where: { email } });

    if (localUser) {
      throw new BadRequestException('A user account with this email already exists.');
    } else {
      // Create/Fetch from Supabase
      if (!this.supabaseAdmin) throw new Error('Supabase Admin not configured');

      tempPassword = this.generatePassword();
      const { data: userData, error: createError } = await this.supabaseAdmin.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: employee.fullName,
          name_with_initials: employee.nameWithInitials,
          phone: employee.phone,
          address: employee.address
        }
      });

      if (createError) {
        if (createError.message.includes('already registered')) {
          // User exists in Supabase but not locally
          throw new BadRequestException('A user account with this email already exists in the identity provider.');
        } else {
          this.logger.error(`Supabase Create Failed: ${createError.message}`);
          throw new BadRequestException(`Failed to create user: ${createError.message}`);
        }
      } else {
        supabaseUid = userData.user.id;
      }
    }

    // 2. Ensure Local User Record
    // We use upsert to handle race conditions or missing local records
    await this.prisma.user.upsert({
      where: { id: supabaseUid },
      update: {
        nameWithInitials: employee.nameWithInitials,
        fullName: employee.fullName,
        address: employee.address,
        phone: employee.phone,
        role: Role.EMPLOYEE,
        // We don't overwrite 'active' status on update to avoid accidentally re-enabling blocked users
      },
      create: {
        id: supabaseUid,
        email: email,
        nameWithInitials: employee.nameWithInitials,
        fullName: employee.fullName,
        address: employee.address,
        phone: employee.phone,
        role: Role.EMPLOYEE,
        active: true
      }
    });

    // 3. Link Employee
    await this.prisma.employee.update({
      where: { id },
      data: { userId: supabaseUid }
    });

    // 4. Ensure Company Membership
    await this.prisma.userCompany.upsert({
      where: {
        userId_companyId: {
          userId: supabaseUid,
          companyId: employee.companyId
        }
      },
      update: {
        active: true, // Activate membership during provisioning
        role: Role.EMPLOYEE
      },
      create: {
        userId: supabaseUid,
        companyId: employee.companyId,
        role: Role.EMPLOYEE,
        permissions: {},
        active: true // Active immediately
      }
    });

    return {
      email,
      userId: supabaseUid,
      password: tempPassword,
      message: tempPassword ? 'User created and linked.' : 'Existing user linked.'
    };
  }

  async deprovisionUser(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.userId) return { message: 'Employee was not linked to a user account.' };

    const userId = employee.userId;

    // 1. Unlink Employee
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { userId: null },
    });

    // 2. Delete Dependencies (Memberships, Notifications)
    await this.prisma.userCompany.deleteMany({ where: { userId: userId } });
    await this.prisma.notification.deleteMany({ where: { userId: userId } });

    // 3. Delete from Supabase
    if (this.supabaseAdmin) {
      const { error } = await this.supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) {
        this.logger.error(`Failed to delete Supabase user ${userId}: ${error.message}`);
        // Continue to clean up local DB regardless of Supabase error (e.g. if user already gone)
      }
    }

    // 4. Delete Local User
    try {
      await this.prisma.user.delete({
        where: { id: userId }
      });
    } catch (e) {
      this.logger.error(`Failed to delete local user ${userId}: ${e.message}`);
      // If delete fails, it might be due to other constraints. But we tried.
    }

    return { message: 'User account permanently deleted.' };
  }
}
