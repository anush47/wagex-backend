import { Employee as PrismaEmployee } from '@prisma/client';
import { EmploymentType, Gender } from '../../common/enums/employee.enum';
export declare class Employee implements PrismaEmployee {
    id: string;
    employeeNo: number;
    nic: string | null;
    nameWithInitials: string;
    fullName: string;
    designation: string | null;
    joinedDate: Date;
    resignedDate: Date | null;
    remark: string | null;
    phone: string | null;
    address: string | null;
    email: string | null;
    basicSalary: number;
    status: string;
    companyId: string;
    managerId: string | null;
    userId: string | null;
    gender: Gender;
    employmentType: EmploymentType;
    canSelfEdit: boolean;
    createdAt: Date;
    updatedAt: Date;
}
