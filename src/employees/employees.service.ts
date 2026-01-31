import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Employee } from './entities/employee.entity';
import { QueryDto } from '../common/dto/query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

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

  async findAll(companyId?: string, queryDto?: QueryDto): Promise<PaginatedResponse<Employee>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = queryDto || {};
    const skip = (page - 1) * limit;

    if (!companyId) {
      this.logger.warn('findAll called without companyId context. Returning empty.');
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    // Build where clause
    const where: any = { companyId };
    if (search) {
      where.OR = [
        { employeeNo: { contains: search, mode: 'insensitive' as const } },
        { name: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({ where, skip, take: limit, orderBy }),
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
