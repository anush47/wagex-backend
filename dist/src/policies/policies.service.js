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
var PoliciesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoliciesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const lodash_1 = require("lodash");
let PoliciesService = PoliciesService_1 = class PoliciesService {
    prisma;
    logger = new common_1.Logger(PoliciesService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createPolicyDto) {
        const { companyId, employeeId, settings } = createPolicyDto;
        if (!companyId && !employeeId) {
            throw new Error('Policy must be attached to either a Company or an Employee');
        }
        if (employeeId) {
            const isEmpty = !settings || Object.keys(settings).length === 0;
            if (isEmpty) {
                try {
                    await this.prisma.policy.delete({ where: { employeeId } });
                }
                catch (e) {
                }
                return null;
            }
            return this.prisma.policy.upsert({
                where: { employeeId },
                update: { settings: settings },
                create: {
                    employeeId,
                    settings: settings,
                }
            });
        }
        return this.prisma.policy.upsert({
            where: { companyId },
            update: { settings: settings },
            create: {
                companyId,
                settings: settings,
            }
        });
    }
    async findAll() {
        return this.prisma.policy.findMany();
    }
    async findOne(id) {
        const policy = await this.prisma.policy.findUnique({ where: { id } });
        if (!policy)
            throw new common_1.NotFoundException(`Policy ${id} not found`);
        return policy;
    }
    async findByCompany(companyId) {
        return this.prisma.policy.findUnique({ where: { companyId } });
    }
    async findByEmployee(employeeId) {
        return this.prisma.policy.findUnique({ where: { employeeId } });
    }
    async update(id, updatePolicyDto) {
        return this.prisma.policy.update({
            where: { id },
            data: {
                settings: updatePolicyDto.settings,
            },
        });
    }
    async remove(id) {
        return this.prisma.policy.delete({ where: { id } });
    }
    async getEffectivePolicy(employeeId) {
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                policy: true,
                company: {
                    include: {
                        policy: true
                    }
                }
            }
        });
        if (!employee)
            throw new common_1.NotFoundException(`Employee ${employeeId} not found`);
        const companyPolicy = employee.company?.policy?.settings || {};
        const employeeOverride = employee.policy?.settings || {};
        const effectivePolicy = (0, lodash_1.merge)({}, companyPolicy, employeeOverride);
        if (employeeOverride.shifts?.list) {
            if (!effectivePolicy.shifts)
                effectivePolicy.shifts = {};
            if (effectivePolicy.shifts) {
                effectivePolicy.shifts.list = employeeOverride.shifts.list;
            }
        }
        return effectivePolicy;
    }
    async getEffectivePolicyDetail(employeeId) {
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                policy: true,
                company: {
                    include: {
                        policy: true
                    }
                }
            }
        });
        if (!employee)
            throw new common_1.NotFoundException(`Employee ${employeeId} not found`);
        const companyPolicy = employee.company?.policy?.settings || {};
        const employeeOverride = employee.policy?.settings || {};
        const effectivePolicy = await this.getEffectivePolicy(employeeId);
        const overriddenFields = Object.keys(employeeOverride);
        return {
            effective: effectivePolicy,
            source: {
                isOverridden: overriddenFields.length > 0,
                overriddenFields,
                companyPolicyId: employee.company?.policy?.id,
                employeePolicyId: employee.policy?.id
            },
            employee: {
                id: employee.id,
                calendarId: employee.calendarId || employee.company?.calendarId
            },
            companyPolicy,
            employeeOverride
        };
    }
    async removeByEmployee(employeeId) {
        const policy = await this.prisma.policy.findUnique({ where: { employeeId } });
        if (!policy)
            throw new common_1.NotFoundException("No override policy found for this employee");
        return this.remove(policy.id);
    }
};
exports.PoliciesService = PoliciesService;
exports.PoliciesService = PoliciesService = PoliciesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PoliciesService);
//# sourceMappingURL=policies.service.js.map