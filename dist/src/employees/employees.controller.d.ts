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
            name: string;
            id: string;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            employerNumber: string | null;
            address: string | null;
            startedDate: Date | null;
            logo: string | null;
            files: import("@prisma/client/runtime/client").JsonValue | null;
        };
        user: {
            id: string;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
            role: import("@prisma/client").$Enums.Role;
            nameWithInitials: string | null;
            fullName: string | null;
            phone: string | null;
            email: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        address: string | null;
        files: import("@prisma/client/runtime/client").JsonValue | null;
        userId: string | null;
        companyId: string;
        employeeNo: number;
        nic: string | null;
        nameWithInitials: string;
        fullName: string;
        designation: string | null;
        phone: string | null;
        email: string | null;
        basicSalary: number;
        status: string;
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
