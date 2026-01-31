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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = UsersService_1 = class UsersService {
    prisma;
    logger = new common_1.Logger(UsersService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createUserDto) {
        this.logger.log(`Creating new user: ${createUserDto.email}`);
        return this.prisma.user.create({
            data: createUserDto,
        });
    }
    async findAll(queryDto) {
        const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = queryDto;
        const skip = (page - 1) * limit;
        const where = search ? {
            OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { nameWithInitials: { contains: search, mode: 'insensitive' } },
                { fullName: { contains: search, mode: 'insensitive' } },
            ]
        } : {};
        const orderBy = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' };
        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    memberships: {
                        include: { company: true }
                    }
                }
            }),
            this.prisma.user.count({ where })
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
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                memberships: {
                    include: { company: true }
                }
            }
        });
        if (!user) {
            this.logger.error(`User not found with ID: ${id}`);
            throw new common_1.NotFoundException(`User with ID "${id}" not found`);
        }
        return user;
    }
    async findOneByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
            include: {
                memberships: {
                    include: { company: true }
                }
            }
        });
    }
    async update(id, updateUserDto) {
        await this.findOne(id);
        this.logger.log(`Updating user ID: ${id}`);
        return this.prisma.user.update({
            where: { id },
            data: updateUserDto,
        });
    }
    async remove(id) {
        await this.findOne(id);
        this.logger.log(`Deleting user ID: ${id}`);
        return this.prisma.user.delete({
            where: { id },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map