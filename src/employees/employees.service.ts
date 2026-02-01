import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Employee } from './entities/employee.entity';
import { QueryDto } from '../common/dto/query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { Role, User } from '@prisma/client';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private readonly prisma: PrismaService) { }

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    this.logger.log(`Creating new employee for company: ${createEmployeeDto.companyId}`);
    return this.prisma.employee.create({
      data: createEmployeeDto,
    });
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
      data,
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

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    // Ensure it exists first
    await this.findOne(id);

    this.logger.log(`Updating employee ID: ${id}`);
    return this.prisma.employee.update({
      where: { id },
      data: updateEmployeeDto,
    });
  }

  async remove(id: string): Promise<Employee> {
    // Ensure it exists first
    await this.findOne(id);

    this.logger.log(`Deleting employee ID: ${id}`);
    return this.prisma.employee.delete({
      where: { id },
    });
  }
}
