"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CompaniesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompaniesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CompaniesService = CompaniesService_1 = class CompaniesService {
    prisma;
    logger = new common_1.Logger(CompaniesService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createCompanyDto) {
        this.logger.log(`Creating new company: ${createCompanyDto.name}`);
        return this.prisma.company.create({
            data: createCompanyDto,
        });
    }
    async findAll() {
        return this.prisma.company.findMany();
    }
    async findOne(id) {
        const company = await this.prisma.company.findUnique({
            where: { id },
        });
        if (!company) {
            this.logger.error(`Company not found with ID: ${id}`);
            throw new common_1.NotFoundException(`Company with ID "${id}" not found`);
        }
        return company;
    }
    async update(id, updateCompanyDto) {
        await this.findOne(id);
        this.logger.log(`Updating company ID: ${id}`);
        return this.prisma.company.update({
            where: { id },
            data: updateCompanyDto,
        });
    }
    async remove(id) {
        await this.findOne(id);
        this.logger.log(`Deleting company ID: ${id}`);
        return this.prisma.company.delete({
            where: { id },
        });
    }
};
exports.CompaniesService = CompaniesService;
exports.CompaniesService = CompaniesService = CompaniesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompaniesService);
//# sourceMappingURL=companies.service.js.map