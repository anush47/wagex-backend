import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
export declare class DepartmentsController {
    private readonly departmentsService;
    constructor(departmentsService: DepartmentsService);
    create(createDepartmentDto: CreateDepartmentDto, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        name: string;
        parentId: string | null;
        headId: string | null;
    }>;
    findAll(companyId: string, req: any): Promise<({
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
    findOne(id: string, req: any): Promise<{
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
    update(id: string, updateDepartmentDto: UpdateDepartmentDto, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        description: string | null;
        name: string;
        parentId: string | null;
        headId: string | null;
    }>;
    remove(id: string, req: any): Promise<{
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
