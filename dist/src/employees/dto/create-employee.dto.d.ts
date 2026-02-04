import { EmploymentType, Gender } from '../../common/enums/employee.enum';
export declare class CreateEmployeeDto {
    employeeNo: string;
    name: string;
    basicSalary: number;
    companyId: string;
    managerId?: string;
    gender?: Gender;
    employmentType?: EmploymentType;
}
