import { ApiProperty } from '@nestjs/swagger';
import { Employee as PrismaEmployee } from '@prisma/client';
import { EmploymentType, Gender } from '../../common/enums/employee.enum';

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

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
