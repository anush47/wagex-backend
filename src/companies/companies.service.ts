import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Company } from './entities/company.entity';
import { QueryDto } from '../common/dto/query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { DEFAULT_EMPLOYER_PERMISSIONS } from '../auth/permissions';
@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    this.logger.log(`Creating new company: ${createCompanyDto.name}`);
    return this.prisma.company.create({
      data: {
        ...createCompanyDto,
        timezone: createCompanyDto.timezone || 'Asia/Colombo',
      },
    });
  }

  async createWithMembership(createCompanyDto: CreateCompanyDto, userId: string): Promise<Company> {
    this.logger.log(`Creating company with membership for user: ${userId}`);

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          ...createCompanyDto,
          timezone: createCompanyDto.timezone || 'Asia/Colombo',
        },
      });

      await tx.userCompany.create({
        data: {
          userId,
          companyId: company.id,
          role: 'EMPLOYER',
          permissions: DEFAULT_EMPLOYER_PERMISSIONS,
          active: true,
        },
      });

      return company;
    });
  }

  async findAll(queryDto: QueryDto): Promise<PaginatedResponse<Company>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = queryDto;
    const skip = (page - 1) * limit;

    // Build where clause for search
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { address: { contains: search, mode: 'insensitive' as const } },
        { employerNumber: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    // Filter by status if provided
    if (queryDto.status) {
      if (queryDto.status.toUpperCase() === 'ACTIVE') {
        where.active = true;
      } else if (queryDto.status.toUpperCase() === 'INACTIVE') {
        where.active = false;
      }
    }

    // Build orderBy clause
    const orderBy: any = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByIds(ids: string[], queryDto: QueryDto): Promise<PaginatedResponse<Company>> {
    if (ids.length === 0) {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = queryDto;
    const skip = (page - 1) * limit;

    // Build where clause
    // Build where clause
    const where: any = { id: { in: ids } };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { address: { contains: search, mode: 'insensitive' as const } },
        { employerNumber: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    // Filter by status if provided
    if (queryDto.status) {
      if (queryDto.status.toUpperCase() === 'ACTIVE') {
        where.active = true;
      } else if (queryDto.status.toUpperCase() === 'INACTIVE') {
        where.active = false;
      }
    }

    // Build orderBy clause
    const orderBy: any = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
    const company = await this.findOne(id);

    this.logger.log(`Deleting company ID: ${id} ("${company.name}") — preserving billing records`);

    await this.prisma.$transaction(
      async (tx) => {
        // ── Step 1: Deprovision all employee user accounts ──────────────────────
        const provisionedEmployees = await tx.employee.findMany({
          where: { companyId: id, userId: { not: null } },
          select: { id: true, userId: true, fullName: true },
        });

        this.logger.log(
          `Found ${provisionedEmployees.length} provisioned employee account(s) to delete`,
        );

        for (const emp of provisionedEmployees) {
          try {
            // Cascades: sessions, auth accounts, UserCompany memberships, notifications
            await tx.user.delete({ where: { id: emp.userId! } });
            this.logger.log(`Deleted user account for "${emp.fullName}" (userId: ${emp.userId})`);
          } catch (error) {
            if (error.code !== 'P2025') {
              this.logger.error(
                `Failed to delete user account for "${emp.fullName}" (userId: ${emp.userId}): ${error.message}`,
              );
            }
          }
        }

        // ── Step 2: Delete operational data (deepest dependencies first) ────────

        // Attendance sessions reference salary rows — delete sessions/events first
        await tx.attendanceEvent.deleteMany({ where: { companyId: id } });
        await tx.attendanceSession.deleteMany({ where: { companyId: id } });

        // Salary-adjacent records
        await tx.epfRecord.deleteMany({ where: { companyId: id } });
        await tx.etfRecord.deleteMany({ where: { companyId: id } });
        await tx.payment.deleteMany({ where: { companyId: id } });
        await tx.salaryAdvance.deleteMany({ where: { companyId: id } });
        await tx.salary.deleteMany({ where: { companyId: id } });

        // Leave requests
        await tx.leaveRequest.deleteMany({ where: { companyId: id } });

        // Document templates
        await tx.documentTemplate.deleteMany({ where: { companyId: id } });

        // Departments (clear head FK first to avoid self-reference conflict)
        await tx.department.updateMany({ where: { companyId: id }, data: { headId: null } });
        await tx.department.deleteMany({ where: { companyId: id } });

        // Policies
        await tx.policy.deleteMany({ where: { companyId: id } });

        // Remaining UserCompany memberships not already cascade-deleted with users
        await tx.userCompany.deleteMany({ where: { companyId: id } });

        // Employees (details cascade via schema)
        await tx.employee.deleteMany({ where: { companyId: id } });

        // ── Step 3: Detach CompanyBilling so it survives the company deletion ───
        // CompanyBilling.companyId is nullable — nulling it breaks the FK before delete
        await tx.companyBilling.updateMany({
          where: { companyId: id },
          data: { companyId: null },
        });

        this.logger.log(`Detached CompanyBilling from company ID: ${id} — billing history preserved`);

        // ── Step 4: Delete the company row ───────────────────────────────────────
        await tx.company.delete({ where: { id } });
      },
      { timeout: 30000 },
    );

    this.logger.log(`Company ID: ${id} deleted successfully`);
    return company;
  }
}
