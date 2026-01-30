import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
export declare class EmployeesController {
    private readonly employeesService;
    constructor(employeesService: EmployeesService);
    create(createEmployeeDto: CreateEmployeeDto): Promise<{
        name: string;
        companyId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeNo: string;
        basicSalary: number;
        status: string;
    }>;
    findAll(companyId?: string): Promise<{
        name: string;
        companyId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeNo: string;
        basicSalary: number;
        status: string;
    }[]>;
    findOne(id: string): Promise<{
        name: string;
        companyId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeNo: string;
        basicSalary: number;
        status: string;
    } | null>;
    update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<{
        name: string;
        companyId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeNo: string;
        basicSalary: number;
        status: string;
    }>;
    remove(id: string): Promise<{
        name: string;
        companyId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employeeNo: string;
        basicSalary: number;
        status: string;
    }>;
}
