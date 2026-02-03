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

    @ApiPropertyOptional({ example: 'EMP-001', description: 'Employer Number' })
    employerNumber: string | null;

    @ApiPropertyOptional({ example: '123 Main St, City', description: 'Company Address' })
    address: string | null;

    @ApiPropertyOptional({ example: '2023-01-01T00:00:00Z', description: 'Date started' })
    startedDate: Date | null;

    @ApiPropertyOptional({ example: 'https://example.com/logo.png', description: 'Logo URL' })
    logo: string | null;

    @ApiPropertyOptional({ example: [], description: 'Uploaded files' })
    files: any | null;

    @ApiProperty({ type: () => [UserCompany], description: 'Company memberships/users' })
    memberships?: UserCompany[];

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
