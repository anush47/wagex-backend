import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Employee } from './entities/employee.entity';
import { QueryDto } from '../common/dto/query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { ConfigService } from '@nestjs/config';
export declare class EmployeesService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    private supabaseAdmin;
    constructor(prisma: PrismaService, configService: ConfigService);
    create(createEmployeeDto: CreateEmployeeDto): Promise<Employee>;
    findAll(companyId?: string, queryDto?: QueryDto, user?: any): Promise<PaginatedResponse<Employee>>;
    findOne(id: string): Promise<Employee>;
    update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee>;
    remove(id: string): Promise<Employee>;
    private generatePassword;
    provisionUser(id: string): Promise<{
        email: string;
        userId: string;
        password?: string;
        message: string;
    }>;
    deprovisionUser(employeeId: string): Promise<{
        message: string;
    }>;
}
