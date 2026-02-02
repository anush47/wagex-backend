import { ApiProperty } from '@nestjs/swagger';
import { Employee as PrismaEmployee } from '@prisma/client';

export class Employee implements PrismaEmployee {
    @ApiProperty({ example: 'uuid-1234', description: 'Unique identifier' })
    id: string;

    @ApiProperty({ example: 'EMP-001', description: 'Employee Number' })
    employeeNo: string;

    @ApiProperty({ example: 'Jane Doe', description: 'Full Name' })
    name: string;

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

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
