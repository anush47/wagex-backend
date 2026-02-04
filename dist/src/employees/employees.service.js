"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmployeesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const crypto = __importStar(require("crypto"));
let EmployeesService = EmployeesService_1 = class EmployeesService {
    prisma;
    configService;
    logger = new common_1.Logger(EmployeesService_1.name);
    supabaseAdmin;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        const supabaseUrl = this.configService.get('SUPABASE_URL');
        const serviceRoleKey = this.configService.get('SUPABASE_SERVICE_ROLE_KEY');
        if (supabaseUrl && serviceRoleKey) {
            this.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
        }
        else {
            this.logger.warn('Supabase Admin credentials missing. User provisioning will be disabled.');
        }
    }
    async create(createEmployeeDto) {
        this.logger.log(`Creating new employee for company: ${createEmployeeDto.companyId}`);
        const data = {
            ...createEmployeeDto,
            joinedDate: createEmployeeDto.joinedDate
                ? new Date(createEmployeeDto.joinedDate)
                : new Date(),
            resignedDate: createEmployeeDto.resignedDate
                ? new Date(createEmployeeDto.resignedDate)
                : undefined,
            remark: createEmployeeDto.remark || undefined,
        };
        const employee = await this.prisma.employee.create({ data });
        return employee;
    }
    async findAll(companyId, queryDto, user) {
        const { page = 1, limit = 20, search, sortBy = 'employeeNo', sortOrder = 'asc', status = 'ACTIVE' } = queryDto || {};
        const skip = (page - 1) * limit;
        const where = {};
        if (status && status.toUpperCase() !== 'ALL') {
            where.status = status.toUpperCase();
        }
        if (companyId) {
            where.companyId = companyId;
            if (user && user.role === client_1.Role.EMPLOYER) {
                const hasAccess = user.memberships?.some(m => m.companyId === companyId);
                if (!hasAccess) {
                    this.logger.warn(`Unauthorized access attempt by Employer ${user.id} for company ${companyId}`);
                    return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
                }
            }
        }
        else if (user) {
            if (user.role === client_1.Role.EMPLOYER) {
                const accessibleCompanyIds = user.memberships?.map(m => m.companyId) || [];
                if (accessibleCompanyIds.length === 0) {
                    return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
                }
                where.companyId = { in: accessibleCompanyIds };
            }
        }
        else {
            this.logger.warn('findAll called without companyId and without user context');
            return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
        }
        if (search) {
            const isNumericSearch = !isNaN(Number(search));
            where.OR = [
                ...(isNumericSearch ? [{ employeeNo: Number(search) }] : []),
                { nameWithInitials: { contains: search, mode: 'insensitive' } },
                { fullName: { contains: search, mode: 'insensitive' } },
                { nic: { contains: search, mode: 'insensitive' } },
                { designation: { contains: search, mode: 'insensitive' } },
            ];
        }
        const orderBy = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' };
        const [data, total] = await Promise.all([
            this.prisma.employee.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            }),
            this.prisma.employee.count({ where })
        ]);
        return {
            data: data,
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
        const { companyId, ...updateData } = updateEmployeeDto;
        this.logger.log(`Updating employee ID: ${id}`);
        const updated = await this.prisma.employee.update({
            where: { id },
            data: updateData,
        });
        if (updateEmployeeDto.allowLogin !== undefined && updated.userId && updated.companyId) {
            await this.prisma.userCompany.updateMany({
                where: {
                    userId: updated.userId,
                    companyId: updated.companyId
                },
                data: { active: updateEmployeeDto.allowLogin }
            });
        }
        return updated;
    }
    async remove(id) {
        await this.findOne(id);
        this.logger.log(`Deleting employee ID: ${id}`);
        const deleted = await this.prisma.employee.delete({
            where: { id },
        });
        return deleted;
    }
    generatePassword(length = 12) {
        return crypto.randomBytes(length).toString('hex').slice(0, length);
    }
    async provisionUser(id) {
        const employee = await this.prisma.employee.findUnique({
            where: { id },
        });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        if (!employee.companyId)
            throw new common_1.BadRequestException('Employee not assigned to a company');
        if (employee.userId)
            throw new common_1.BadRequestException('Employee is already linked to a user account.');
        const email = employee.email;
        if (!email)
            throw new common_1.BadRequestException('Employee does not have an email address.');
        let supabaseUid;
        let tempPassword;
        const localUser = await this.prisma.user.findUnique({ where: { email } });
        if (localUser) {
            throw new common_1.BadRequestException('A user account with this email already exists.');
        }
        else {
            if (!this.supabaseAdmin)
                throw new Error('Supabase Admin not configured');
            tempPassword = this.generatePassword();
            const { data: userData, error: createError } = await this.supabaseAdmin.auth.admin.createUser({
                email: email,
                password: tempPassword,
                email_confirm: true,
                user_metadata: {
                    full_name: employee.fullName,
                    name_with_initials: employee.nameWithInitials
                }
            });
            if (createError) {
                if (createError.message.includes('already registered')) {
                    throw new common_1.BadRequestException('A user account with this email already exists in the identity provider.');
                }
                else {
                    this.logger.error(`Supabase Create Failed: ${createError.message}`);
                    throw new common_1.BadRequestException(`Failed to create user: ${createError.message}`);
                }
            }
            else {
                supabaseUid = userData.user.id;
            }
        }
        await this.prisma.user.upsert({
            where: { id: supabaseUid },
            update: {},
            create: {
                id: supabaseUid,
                email: email,
                nameWithInitials: employee.nameWithInitials,
                fullName: employee.fullName,
                role: client_1.Role.EMPLOYEE,
                active: true
            }
        });
        await this.prisma.employee.update({
            where: { id },
            data: { userId: supabaseUid }
        });
        await this.prisma.userCompany.upsert({
            where: {
                userId_companyId: {
                    userId: supabaseUid,
                    companyId: employee.companyId
                }
            },
            update: {},
            create: {
                userId: supabaseUid,
                companyId: employee.companyId,
                role: client_1.Role.EMPLOYEE,
                permissions: {}
            }
        });
        return {
            email,
            userId: supabaseUid,
            password: tempPassword,
            message: tempPassword ? 'User created and linked.' : 'Existing user linked.'
        };
    }
    async deprovisionUser(employeeId) {
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
        });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        if (!employee.userId)
            return { message: 'Employee was not linked to a user account.' };
        const userId = employee.userId;
        await this.prisma.employee.update({
            where: { id: employeeId },
            data: { userId: null },
        });
        await this.prisma.userCompany.deleteMany({ where: { userId: userId } });
        await this.prisma.notification.deleteMany({ where: { userId: userId } });
        if (this.supabaseAdmin) {
            const { error } = await this.supabaseAdmin.auth.admin.deleteUser(userId);
            if (error) {
                this.logger.error(`Failed to delete Supabase user ${userId}: ${error.message}`);
            }
        }
        try {
            await this.prisma.user.delete({
                where: { id: userId }
            });
        }
        catch (e) {
            this.logger.error(`Failed to delete local user ${userId}: ${e.message}`);
        }
        return { message: 'User account permanently deleted.' };
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = EmployeesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map