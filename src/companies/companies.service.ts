import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Company } from './entities/company.entity';
import { QueryDto } from '../common/dto/query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(private readonly prisma: PrismaService) { }

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    this.logger.log(`Creating new company: ${createCompanyDto.name}`);
    return this.prisma.company.create({
      data: createCompanyDto,
    });
  }

  async createWithMembership(createCompanyDto: CreateCompanyDto, userId: string): Promise<Company> {
    this.logger.log(`Creating company with membership for user: ${userId}`);

    return this.prisma.$transaction(async (tx) => {
      // Create company
      const company = await tx.company.create({
        data: createCompanyDto,
      });

      // Add user as company member with employer role
      await tx.userCompany.create({
        data: {
          userId,
          companyId: company.id,
          role: 'EMPLOYER',
          permissions: {
            VIEW_COMPANY: true,
            EDIT_COMPANY: true,
            MANAGE_EMPLOYEES: true
          }
        }
      });

      return company;
    });
  }

  async findAll(queryDto: QueryDto): Promise<PaginatedResponse<Company>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = queryDto;
    const skip = (page - 1) * limit;

    // Build where clause for search
    const where = search ? {
      name: { contains: search, mode: 'insensitive' as const }
    } : {};

    // Build orderBy clause
    const orderBy: any = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.company.count({ where })
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

  async findByIds(ids: string[], queryDto: QueryDto): Promise<PaginatedResponse<Company>> {
    if (ids.length === 0) {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = queryDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { id: { in: ids } };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' as const };
    }

    // Build orderBy clause
    const orderBy: any = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.company.count({ where })
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

  async findOne(id: string): Promise<Company> {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      this.logger.error(`Company not found with ID: ${id}`);
      throw new NotFoundException(`Company with ID "${id}" not found`);
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    // Ensure it exists
    await this.findOne(id);

    this.logger.log(`Updating company ID: ${id}`);
    return this.prisma.company.update({
      where: { id },
      data: updateCompanyDto,
    });
  }

  async remove(id: string): Promise<Company> {
    // Ensure it exists
    await this.findOne(id);

    this.logger.log(`Deleting company ID: ${id}`);
    return this.prisma.company.delete({
      where: { id },
    });
  }
}
