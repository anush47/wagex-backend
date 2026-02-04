import { ApiProperty } from '@nestjs/swagger';
import { Role, UserCompany as PrismaUserCompany } from '@prisma/client';

export class UserCompany implements PrismaUserCompany {
    @ApiProperty({ example: 'uuid-1234', description: 'Unique identifier' })
    id: string;

    @ApiProperty({ example: 'user-uuid', description: 'User ID' })
    userId: string;

    @ApiProperty({ example: 'company-uuid', description: 'Company ID' })
    companyId: string;

    @ApiProperty({ enum: Role, example: Role.EMPLOYEE, description: 'Role within the company' })
    role: Role;

    @ApiProperty({
        example: { can_edit_payroll: true },
        description: 'Granular permissions as JSON',
        nullable: true
    })
    permissions: any; // Type-safe as Json in Prisma

    @ApiProperty({ example: true, description: 'Is access active' })
    active: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
