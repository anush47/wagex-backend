import { ApiProperty } from '@nestjs/swagger';
import { Role, User as PrismaUser } from '@prisma/client';
import { Company } from '../../companies/entities/company.entity';
import { UserCompany } from './user-company.entity';

export class User implements PrismaUser {
    @ApiProperty({ example: 'uuid-1234', description: 'Unique identifier' })
    id: string;

    @ApiProperty({ example: 'user@example.com', description: 'Email address' })
    email: string;

    @ApiProperty({ example: 'J. Doe', description: 'Name with Initials', nullable: true })
    nameWithInitials: string | null;

    @ApiProperty({ example: 'John Doe', description: 'Full Name', nullable: true })
    fullName: string | null;

    @ApiProperty({ example: '123 Main St', description: 'Address', nullable: true })
    address: string | null;

    @ApiProperty({ example: '+1 555 123 4567', description: 'Phone', nullable: true })
    phone: string | null;

    @ApiProperty({ enum: Role, example: Role.EMPLOYEE, description: 'User role' })
    role: Role;

    @ApiProperty({ example: true, description: 'Is account active and allowed to login' })
    active: boolean;

    @ApiProperty({ type: () => [UserCompany], description: 'Company memberships' })
    memberships?: UserCompany[];

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
