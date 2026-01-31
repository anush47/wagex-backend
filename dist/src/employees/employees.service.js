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
var EmployeesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EmployeesService = EmployeesService_1 = class EmployeesService {
    prisma;
    logger = new common_1.Logger(EmployeesService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createEmployeeDto) {
        this.logger.log(`Creating new employee for company: ${createEmployeeDto.companyId}`);
        return this.prisma.employee.create({
            data: createEmployeeDto,
        });
    }
    async findAll(companyId, queryDto) {
        const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = queryDto || {};
        const skip = (page - 1) * limit;
        if (!companyId) {
            this.logger.warn('findAll called without companyId context. Returning empty.');
            return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
        }
        const where = { companyId };
        if (search) {
            where.OR = [
                { employeeNo: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
            ];
        }
        const orderBy = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' };
        const [data, total] = await Promise.all([
            this.prisma.employee.findMany({ where, skip, take: limit, orderBy }),
            this.prisma.employee.count({ where })
        ]);
        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async findOne(id) {
        const employee = await this.prisma.employee.findUnique({
            where: { id },
        });
        if (!employee) {
            this.logger.error(`Employee not found with ID: ${id}`);
            throw new common_1.NotFoundException(`Employee with ID "${id}" not found`);
        }
        return employee;
    }
    async update(id, updateEmployeeDto) {
        await this.findOne(id);
        this.logger.log(`Updating employee ID: ${id}`);
        return this.prisma.employee.update({
            where: { id },
            data: updateEmployeeDto,
        });
    }
    async remove(id) {
        await this.findOne(id);
        this.logger.log(`Deleting employee ID: ${id}`);
        return this.prisma.employee.delete({
            where: { id },
        });
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = EmployeesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map