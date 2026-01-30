import { Employee as PrismaEmployee } from '@prisma/client';
export declare class Employee implements PrismaEmployee {
    id: string;
    employeeNo: string;
    name: string;
    basicSalary: number;
    status: string;
    companyId: string;
    managerId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
