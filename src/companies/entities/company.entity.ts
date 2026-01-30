import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Company as PrismaCompany } from '@prisma/client';
import { UserCompany } from '../../users/entities/user-company.entity';

export class Company implements PrismaCompany {
    @ApiProperty({ example: 'uuid-1234', description: 'Unique identifier' })
    id: string;

    @ApiProperty({ example: 'WageX Inc.', description: 'Company Name' })
    name: string;

    @ApiProperty({ example: true, description: 'Is company active' })
    active: boolean;

    @ApiProperty({ type: () => [UserCompany], description: 'Company memberships/users' })
    memberships?: UserCompany[];

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
