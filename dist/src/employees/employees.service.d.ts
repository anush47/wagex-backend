import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class EmployeesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
