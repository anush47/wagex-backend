import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryDto } from '../common/dto/query.dto';
export declare class EmployeesController {
    private readonly employeesService;
    private readonly logger;
    constructor(employeesService: EmployeesService);
    create(createEmployeeDto: CreateEmployeeDto, req: any): Promise<import("./entities/employee.entity").Employee>;
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
