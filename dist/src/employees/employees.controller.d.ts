import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryDto } from '../common/dto/query.dto';
export declare class EmployeesController {
    private readonly employeesService;
    private readonly logger;
    constructor(employeesService: EmployeesService);
    create(createEmployeeDto: CreateEmployeeDto, req: any): Promise<import("./entities/employee.entity").Employee>;
    getMe(req: any): Promise<{
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
    findAll(queryDto: QueryDto, req: any): Promise<import("../common/interfaces/paginated-response.interface").PaginatedResponse<import("./entities/employee.entity").Employee>>;
    findOne(id: string, req: any): Promise<import("./entities/employee.entity").Employee>;
    update(id: string, updateEmployeeDto: UpdateEmployeeDto, req: any): Promise<import("./entities/employee.entity").Employee>;
    remove(id: string, req: any): Promise<import("./entities/employee.entity").Employee>;
    provisionUser(id: string, req: any): Promise<{
        email: string;
        userId: string;
        password?: string;
        message: string;
    }>;
    deprovisionUser(id: string, req: any): Promise<{
        message: string;
    }>;
}
