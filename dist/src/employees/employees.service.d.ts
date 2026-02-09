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
    findMe(userId: string): Promise<{
        company: {
            id: string;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            address: string | null;
            employerNumber: string | null;
            startedDate: Date | null;
            logo: string | null;
            files: import("@prisma/client/runtime/client").JsonValue | null;
            calendarId: string | null;
        };
        user: {
            role: import("@prisma/client").$Enums.Role;
            id: string;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            nameWithInitials: string | null;
            fullName: string | null;
            address: string | null;
            phone: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        companyId: string;
        email: string | null;
        nameWithInitials: string;
        fullName: string;
        address: string | null;
        phone: string | null;
        files: import("@prisma/client/runtime/client").JsonValue | null;
        calendarId: string | null;
        status: string;
        employeeNo: number;
        nic: string | null;
        designation: string | null;
        basicSalary: number;
        gender: import("@prisma/client").$Enums.Gender;
        employmentType: import("@prisma/client").$Enums.EmploymentType;
        joinedDate: Date;
        resignedDate: Date | null;
        remark: string | null;
        managerId: string | null;
        canSelfEdit: boolean;
        photo: string | null;
        departmentId: string | null;
    }>;
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
