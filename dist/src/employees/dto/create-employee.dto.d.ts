import { EmploymentType, Gender } from '../../common/enums/employee.enum';
export declare class CreateEmployeeDto {
    employeeNo: number;
    nic: string;
    nameWithInitials: string;
    fullName: string;
    designation?: string;
    canSelfEdit?: boolean;
    joinedDate?: string;
    resignedDate?: string;
    remark?: string;
    address?: string;
    phone?: string;
    email?: string;
    basicSalary: number;
    companyId: string;
    managerId?: string;
    status?: string;
    gender?: Gender;
    employmentType?: EmploymentType;
    photo?: string;
    files?: any;
    active?: boolean;
    departmentId?: string;
}
