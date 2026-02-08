import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createDepartmentDto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: createDepartmentDto,
    });
  }

  async findAll(companyId: string) {
    return this.prisma.department.findMany({
      where: { companyId },
      include: {
        head: {
          select: {
            id: true,
            nameWithInitials: true,
            photo: true
          }
        },
        _count: {
          select: { employees: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        head: {
          select: {
            id: true,
            nameWithInitials: true,
            photo: true
          }
        }
      }
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found.`);
    }

    return department;
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    try {
      return await this.prisma.department.update({
        where: { id },
        data: updateDepartmentDto,
      });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new NotFoundException(`Reference error: The assigned Parent Department or Head does not exist.`);
      }
      if (error.code === 'P2025') {
        throw new NotFoundException(`Department with ID ${id} not found.`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    // Check constraints if needed (e.g. dont delete if has employees)
    // For now, allow delete (standard behavior)
    return this.prisma.department.delete({
      where: { id },
    });
  }
}
