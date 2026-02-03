import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { QueryDto } from '../common/dto/query.dto';
export declare class CompaniesController {
    private readonly companiesService;
    private readonly logger;
    constructor(companiesService: CompaniesService);
    create(createCompanyDto: CreateCompanyDto, req: any): Promise<import("./entities/company.entity").Company>;
    findAll(req: any, queryDto: QueryDto): Promise<import("../common/interfaces/paginated-response.interface").PaginatedResponse<import("./entities/company.entity").Company>>;
    findOne(id: string, req: any): Promise<import("./entities/company.entity").Company>;
    update(id: string, updateCompanyDto: UpdateCompanyDto, req: any): Promise<import("./entities/company.entity").Company>;
    remove(id: string, req: any): Promise<import("./entities/company.entity").Company>;
}
