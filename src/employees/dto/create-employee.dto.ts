import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';
import { EmploymentType, Gender, MaritalStatus } from '../../common/enums/employee.enum';

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

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    canSelfEdit?: boolean;

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

    @ApiProperty({ example: 'ACTIVE', description: 'Employment Status', required: false })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiProperty({ enum: Gender, example: Gender.MALE })
    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender;

    @ApiProperty({ enum: EmploymentType, example: EmploymentType.PERMANENT })
    @IsEnum(EmploymentType)
    @IsOptional()
    employmentType?: EmploymentType;

    @ApiProperty({ example: 'path/to/photo.jpg', required: false })
    @IsOptional()
    @IsString()
    photo?: string;

    @ApiProperty({ example: [], required: false })
    @IsOptional()
    files?: any;

    @ApiProperty({ example: true, description: 'Portal Access (User Active Status)', required: false })
    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @ApiProperty({ example: 'dept-uuid', description: 'Department ID', required: false })
    @IsOptional()
    @IsUUID()
    departmentId?: string;

    @ApiProperty({ example: 'Bank of Ceylon', description: 'Bank Name', required: false })
    @IsOptional()
    @IsString()
    bankName?: string;

    @ApiProperty({ example: 'Kaduwela', description: 'Bank Branch', required: false })
    @IsOptional()
    @IsString()
    bankBranch?: string;

    @ApiProperty({ example: '1234567890', description: 'Account Number', required: false })
    @IsOptional()
    @IsString()
    accountNumber?: string;

    @ApiProperty({ example: 'Mary Doe', description: 'Mothers Name', required: false })
    @IsOptional()
    @IsString()
    mothersName?: string;

    @ApiProperty({ example: 'John Doe Sr.', description: 'Fathers Name', required: false })
    @IsOptional()
    @IsString()
    fathersName?: string;

    @ApiProperty({ enum: MaritalStatus, example: MaritalStatus.SINGLE })
    @IsEnum(MaritalStatus)
    @IsOptional()
    maritalStatus?: MaritalStatus;

    @ApiProperty({ example: 'Jane Doe', description: 'Spouse Name', required: false })
    @IsOptional()
    @IsString()
    spouseName?: string;

    @ApiProperty({ example: 'Sri Lankan', description: 'Nationality', required: false })
    @IsOptional()
    @IsString()
    nationality?: string;

    @ApiProperty({ example: 'Jane Doe', description: 'Emergency Contact Name', required: false })
    @IsOptional()
    @IsString()
    emergencyContactName?: string;

    @ApiProperty({ example: '+94771234567', description: 'Emergency Contact Phone', required: false })
    @IsOptional()
    @IsString()
    emergencyContactPhone?: string;
}
