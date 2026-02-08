import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class DepartmentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(createDepartmentDto: CreateDepartmentDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        parentId: string | null;
        headId: string | null;
    }>;
    findAll(companyId: string): Promise<({
        _count: {
            employees: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        parentId: string | null;
        headId: string | null;
    })[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        parentId: string | null;
        headId: string | null;
    }>;
    update(id: string, updateDepartmentDto: UpdateDepartmentDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        parentId: string | null;
        headId: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        parentId: string | null;
        headId: string | null;
    }>;
}
