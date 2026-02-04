import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';
import { EmploymentType, Gender } from '../../common/enums/employee.enum';

export class CreateEmployeeDto {
    @ApiProperty({ example: 1001, description: 'Employee Number' })
    @IsNotEmpty()
    @IsNumber()
    employeeNo: number;

    @ApiProperty({ example: '199512345678', description: 'NIC' })
    @IsNotEmpty()
    @IsString()
    nic: string;

    @ApiProperty({ example: 'J. Doe', description: 'Name with Initials' })
    @IsNotEmpty()
    @IsString()
    nameWithInitials: string;

    @ApiProperty({ example: 'Johnathan Samuel Doe', description: 'Full Name' })
    @IsNotEmpty()
    @IsString()
    fullName: string;

    @ApiProperty({ example: 'Software Engineer', description: 'Designation', required: false })
    @IsOptional()
    @IsString()
    designation?: string;

    @ApiProperty({ example: '2024-01-01', description: 'Joined Date', required: false })
    @IsOptional()
    @IsString()
    joinedDate?: string;

    @ApiProperty({ example: '2025-01-01', description: 'Resigned Date', required: false })
    @IsOptional()
    @IsString()
    resignedDate?: string;

    @ApiProperty({ example: 'Excellent performance.', description: 'Remarks', required: false })
    @IsOptional()
    @IsString()
    remark?: string;

    @ApiProperty({ example: 'No. 123, Main Street, Colombo', description: 'Address', required: false })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ example: '+94771234567', description: 'Phone Number', required: false })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ example: 'john@example.com', description: 'Email Address', required: false })
    @IsOptional()
    @IsString()
    email?: string;

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

    @ApiProperty({ example: true, description: 'Portal Access (User Active Status)', required: false })
    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
