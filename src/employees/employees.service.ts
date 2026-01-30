import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Employee } from './entities/employee.entity';

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

  async findAll(companyId?: string): Promise<Employee[]> {
    if (!companyId) {
      this.logger.warn('findAll called without companyId context. Returning empty.');
      return [];
    }

    return this.prisma.employee.findMany({
      where: { companyId }
    });
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
