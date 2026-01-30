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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AuthService = class AuthService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async registerUser(supabaseUid, email, dto) {
        if (dto.role === client_1.Role.EMPLOYER) {
            const { companyName } = dto;
            if (!companyName) {
                throw new common_1.BadRequestException('Company Name is required for Employers.');
            }
            const result = await this.prisma.$transaction(async (tx) => {
                const company = await tx.company.create({
                    data: { name: companyName },
                });
                const user = await tx.user.create({
                    data: {
                        id: supabaseUid,
                        email,
                        nameWithInitials: dto.nameWithInitials,
                        fullName: dto.fullName,
                        address: dto.address,
                        phone: dto.phone,
                        role: client_1.Role.EMPLOYER,
                        companyId: company.id,
                    },
                });
                return { user, company };
            });
            return result;
        }
        const user = await this.prisma.user.create({
            data: {
                id: supabaseUid,
                email,
                nameWithInitials: dto.nameWithInitials,
                fullName: dto.fullName,
                address: dto.address,
                phone: dto.phone,
                role: dto.role,
            },
        });
        return user;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map