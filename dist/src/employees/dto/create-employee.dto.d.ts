import { EmploymentType, Gender } from '../../common/enums/employee.enum';
export declare class CreateEmployeeDto {
    employeeNo: number;
    nic: string;
    nameWithInitials: string;
    fullName: string;
    designation?: string;
    joinedDate?: string;
    resignedDate?: string;
    remark?: string;
    address?: string;
    phone?: string;
    email?: string;
    basicSalary: number;
    companyId: string;
    managerId?: string;
    gender?: Gender;
    employmentType?: EmploymentType;
}
