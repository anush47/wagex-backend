import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Company } from './entities/company.entity';
import { QueryDto } from '../common/dto/query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
export declare class CompaniesService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(createCompanyDto: CreateCompanyDto): Promise<Company>;
    createWithMembership(createCompanyDto: CreateCompanyDto, userId: string): Promise<Company>;
    findAll(queryDto: QueryDto): Promise<PaginatedResponse<Company>>;
    findByIds(ids: string[], queryDto: QueryDto): Promise<PaginatedResponse<Company>>;
    findOne(id: string): Promise<Company>;
    update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company>;
    remove(id: string): Promise<Company>;
}
