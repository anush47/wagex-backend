import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class CompaniesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(createCompanyDto: CreateCompanyDto): Promise<{
        name: string;
        active: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<{
        name: string;
        active: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        name: string;
        active: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<{
        name: string;
        active: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        name: string;
        active: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
