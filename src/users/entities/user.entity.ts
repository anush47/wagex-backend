import { ApiProperty } from '@nestjs/swagger';
import { Role, User as PrismaUser } from '@prisma/client';

export class User implements PrismaUser {
    @ApiProperty({ example: 'uuid-1234', description: 'Unique identifier' })
    id: string;

    @ApiProperty({ example: 'user@example.com', description: 'Email address' })
    email: string;

    @ApiProperty({ example: 'John Doe', description: 'Full name', nullable: true })
    name: string | null;

    @ApiProperty({ enum: Role, example: Role.EMPLOYEE, description: 'User role' })
    role: Role;

    @ApiProperty({ example: true, description: 'Is account active' })
    active: boolean;

    @ApiProperty({ example: 'company-uuid', description: 'Company ID', nullable: true })
    companyId: string | null;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
