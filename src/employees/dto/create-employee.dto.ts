import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { EmploymentType, Gender } from '../../common/enums/employee.enum';

export class CreateEmployeeDto {
    @ApiProperty({ example: 'EMP-001', description: 'Employee Number' })
    @IsNotEmpty()
    @IsString()
    employeeNo: string;

    @ApiProperty({ example: 'Jane Doe', description: 'Full Name' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ example: 50000.0, description: 'Basic Salary' })
    @IsNumber()
    basicSalary: number;

    @ApiProperty({ example: 'company-uuid', description: 'Company ID to assign employee to' })
    @IsNotEmpty()
    @IsUUID()
    companyId: string;

    @ApiProperty({ example: 'manager-uuid', description: 'Manager ID', required: false })
    @IsOptional()
    @IsUUID()
    managerId?: string;

    @ApiProperty({ enum: Gender, example: Gender.MALE })
    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender;

    @ApiProperty({ enum: EmploymentType, example: EmploymentType.PERMANENT })
    @IsEnum(EmploymentType)
    @IsOptional()
    employmentType?: EmploymentType;
}
