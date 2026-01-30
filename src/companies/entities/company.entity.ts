import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Company as PrismaCompany } from '@prisma/client';

export class Company implements PrismaCompany {
    @ApiProperty({ example: 'uuid-1234', description: 'Unique identifier' })
    id: string;

    @ApiProperty({ example: 'WageX Inc.', description: 'Company Name' })
    name: string;

    @ApiProperty({ example: true, description: 'Is company active' })
    active: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
