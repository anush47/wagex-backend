import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Employee as PrismaEmployee, EmploymentType, MaritalStatus } from '@prisma/client';
import { Gender } from '../../common/enums/employee.enum';

export class Employee implements PrismaEmployee {
    @ApiProperty({ example: 'uuid-1234', description: 'Unique identifier' })
    id: string;

    @ApiProperty({ example: 1001, description: 'Employee Number' })
    employeeNo: number;

    @ApiProperty({ example: '199512345678', description: 'NIC' })
    nic: string | null;

    @ApiProperty({ example: 'J. Doe', description: 'Name with Initials' })
    nameWithInitials: string;

    @ApiProperty({ example: 'Johnathan Doe', description: 'Full Name' })
    fullName: string;

    @ApiProperty({ example: 'Software Engineer', description: 'Designation', nullable: true })
    designation: string | null;

    @ApiProperty({ example: '2024-01-01', description: 'Joined Date' })
    joinedDate: Date;

    @ApiProperty({ example: '2025-01-01', description: 'Resigned Date', nullable: true })
    resignedDate: Date | null;

    @ApiProperty({ example: 'Good standing.', description: 'Remarks', nullable: true })
    remark: string | null;

    @ApiProperty({ example: '+94771234567', description: 'Phone Number', nullable: true })
    phone: string | null;

    @ApiProperty({ example: '123 Main St, Colombo', description: 'Address', nullable: true })
    address: string | null;

    @ApiProperty({ example: 'jane@company.com', description: 'Employee Email', nullable: true })
    email: string | null;

    @ApiProperty({ example: 50000.0, description: 'Basic Salary' })
    basicSalary: number;

    @ApiProperty({ example: 'ACTIVE', description: 'Employment Status' })
    status: string;

    @ApiProperty({ example: 'company-uuid', description: 'Company ID' })
    companyId: string;

    @ApiProperty({ example: 'manager-uuid', description: 'Manager ID', nullable: true })
    managerId: string | null;

    @ApiProperty({ example: 'user-uuid', description: 'Linked User ID', nullable: true })
    userId: string | null;

    @ApiProperty({ enum: Gender, example: Gender.MALE })
    gender: Gender;

    @ApiProperty({ enum: EmploymentType, example: EmploymentType.PERMANENT })
    employmentType: EmploymentType;

    @ApiProperty({ example: true, description: 'Whether the employee can edit their own details' })
    canSelfEdit: boolean;

    @ApiProperty({ example: 'path/to/photo.jpg', nullable: true })
    photo: string | null;

    @ApiProperty({ example: [], description: 'Employee files' })
    files: any;

    @ApiProperty({ example: 'dept-uuid', description: 'Department ID', nullable: true })
    departmentId: string | null;

    @ApiProperty({ example: 'Bank of Ceylon', description: 'Bank Name', nullable: true })
    bankName: string | null;

    @ApiProperty({ example: 'Kaduwela', description: 'Bank Branch', nullable: true })
    bankBranch: string | null;

    @ApiProperty({ example: '1234567890', description: 'Account Number', nullable: true })
    accountNumber: string | null;

    @ApiProperty({ example: 'Mary Doe', description: 'Mothers Name', nullable: true })
    mothersName: string | null;

    @ApiProperty({ example: 'John Doe Sr.', description: 'Fathers Name', nullable: true })
    fathersName: string | null;

    @ApiProperty({ enum: MaritalStatus, example: MaritalStatus.SINGLE })
    maritalStatus: MaritalStatus;

    @ApiProperty({ example: 'Jane Doe', description: 'Spouse Name', nullable: true })
    spouseName: string | null;

    @ApiProperty({ example: 'Sri Lankan', description: 'Nationality', nullable: true })
    nationality: string | null;

    @ApiProperty({ example: 'Jane Doe', description: 'Emergency Contact Name', nullable: true })
    emergencyContactName: string | null;

    @ApiProperty({ example: '+94771234567', description: 'Emergency Contact Phone', nullable: true })
    emergencyContactPhone: string | null;

    @ApiPropertyOptional({ example: 'uuid-calendar', description: 'Assigned Calendar ID' })
    calendarId: string | null;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
