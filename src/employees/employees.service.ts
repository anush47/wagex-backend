import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
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
    const employee = await this.prisma.employee.create({
      data: createEmployeeDto as any,
    });
    return employee as unknown as Employee;
  }

  async findAll(companyId?: string, queryDto?: QueryDto, user?: any): Promise<PaginatedResponse<Employee>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = queryDto || {};
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

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
      where.OR = [
        { employeeNo: { contains: search, mode: 'insensitive' as const } },
        { name: { contains: search, mode: 'insensitive' as const } },
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

  async findOne(id: string): Promise<Employee> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
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

    this.logger.log(`Updating employee ID: ${id}`);
    const updated = await this.prisma.employee.update({
      where: { id },
      data: updateEmployeeDto as any,
    });
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
  async provisionUser(employeeId: string): Promise<{ email: string; password?: string; message: string }> {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.email) throw new BadRequestException('Employee must have an email address to create a user account.');

    if (employee.userId) {
      throw new BadRequestException('Employee is already linked to a user account.');
    }

    const email = employee.email;
    let supabaseUid: string;
    let tempPassword: string | undefined;

    // 1. Check if user already exists (Local Hint)
    const localUser = await this.prisma.user.findUnique({ where: { email } });

    if (localUser) {
      supabaseUid = localUser.id;
      // Link and return
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: { userId: supabaseUid }
      });
      return { email, message: 'Existing user linked successfully.' };
    }

    // 2. Create in Supabase (if not local)
    if (!this.supabaseAdmin) throw new Error('Supabase Admin not configured');

    tempPassword = this.generatePassword();
    const { data: userData, error: createError } = await this.supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: employee.name
      }
    });

    if (createError) {
      if (createError.message.includes('already registered')) {
        // Fetch ID via list
        const { data: listData } = await this.supabaseAdmin.auth.admin.listUsers();
        const existing = listData?.users.find((u: any) => u.email === email);
        if (!existing) {
          throw new Error('User exists in Supabase but could not be retrieved.');
        }
        supabaseUid = existing.id;
        tempPassword = undefined; // We didn't create it
      } else {
        this.logger.error(`Supabase Create Failed: ${createError.message}`);
        throw new BadRequestException(`Failed to create user: ${createError.message}`);
      }
    } else {
      supabaseUid = userData.user.id;
    }

    // 3. Create Local User
    await this.prisma.user.create({
      data: {
        id: supabaseUid,
        email: email,
        nameWithInitials: employee.name,
        fullName: employee.name,
        role: Role.EMPLOYEE,
        active: true
      }
    }).catch(e => {
      this.logger.warn('User creation race condition or duplicate ignored.');
    });

    // 4. Link Employee
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { userId: supabaseUid }
    });

    // 5. Add to UserCompany (Membership)
    await this.prisma.userCompany.create({
      data: {
        userId: supabaseUid,
        companyId: employee.companyId,
        role: Role.EMPLOYEE,
        permissions: {}
      }
    }).catch(e => {
      // Ignore
    });

    return {
      email,
      password: tempPassword,
      message: tempPassword ? 'User created and linked.' : 'Existing user linked.'
    };
  }
}
