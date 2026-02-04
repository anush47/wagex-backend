import { Employee as PrismaEmployee } from '@prisma/client';
import { EmploymentType, Gender } from '../../common/enums/employee.enum';
export declare class Employee implements PrismaEmployee {
    id: string;
    employeeNo: string;
    name: string;
    email: string | null;
    basicSalary: number;
    status: string;
    companyId: string;
    managerId: string | null;
    userId: string | null;
    gender: Gender;
    employmentType: EmploymentType;
    createdAt: Date;
    updatedAt: Date;
}
