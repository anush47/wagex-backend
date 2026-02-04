import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class DepartmentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(createDepartmentDto: CreateDepartmentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        name: string;
        parentId: string | null;
        headId: string | null;
    }>;
    findAll(companyId: string): Promise<({
        _count: {
            employees: number;
        };
        head: {
            id: string;
            nameWithInitials: string;
            photo: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        name: string;
        parentId: string | null;
        headId: string | null;
    })[]>;
    findOne(id: string): Promise<{
        parent: {
            id: string;
            name: string;
        } | null;
        children: {
            id: string;
            name: string;
        }[];
        head: {
            id: string;
            nameWithInitials: string;
            photo: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        name: string;
        parentId: string | null;
        headId: string | null;
    }>;
    update(id: string, updateDepartmentDto: UpdateDepartmentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        name: string;
        parentId: string | null;
        headId: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        name: string;
        parentId: string | null;
        headId: string | null;
    }>;
}
