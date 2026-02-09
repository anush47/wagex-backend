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
            address: string | null;
            files: import("@prisma/client/runtime/client").JsonValue | null;
            calendarId: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            active: boolean;
            employerNumber: string | null;
            startedDate: Date | null;
            logo: string | null;
        };
        user: {
            id: string;
            nameWithInitials: string | null;
            fullName: string | null;
            address: string | null;
            phone: string | null;
            email: string;
            createdAt: Date;
            updatedAt: Date;
            active: boolean;
            role: import("@prisma/client").$Enums.Role;
        } | null;
    } & {
        id: string;
        employeeNo: number;
        nic: string | null;
        nameWithInitials: string;
        fullName: string;
        designation: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        basicSalary: number;
        status: string;
        gender: import("@prisma/client").$Enums.Gender;
        employmentType: import("@prisma/client").$Enums.EmploymentType;
        joinedDate: Date;
        resignedDate: Date | null;
        remark: string | null;
        companyId: string;
        userId: string | null;
        managerId: string | null;
        canSelfEdit: boolean;
        photo: string | null;
        files: import("@prisma/client/runtime/client").JsonValue | null;
        departmentId: string | null;
        calendarId: string | null;
        createdAt: Date;
        updatedAt: Date;
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
