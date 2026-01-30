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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevAuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const swagger_1 = require("@nestjs/swagger");
const prisma_service_1 = require("../prisma/prisma.service");
const skip_user_check_decorator_1 = require("./skip-user-check.decorator");
let DevAuthController = class DevAuthController {
    configService;
    prisma;
    jwtService;
    constructor(configService, prisma, jwtService) {
        this.configService = configService;
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async getDevToken(email) {
        const env = this.configService.get('ENVIRONMENT');
        if (env !== 'dev') {
            throw new common_1.NotFoundException('Endpoint not available');
        }
        const user = await this.prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found. Register them first or manually insert into DB?');
        }
        const payload = {
            email: user.email,
            sub: user.id,
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: { provider: 'email' },
            user_metadata: {},
        };
        const token = this.jwtService.sign(payload);
        return {
            accessToken: token,
            user
        };
    }
};
exports.DevAuthController = DevAuthController;
__decorate([
    (0, common_1.Get)('token'),
    (0, skip_user_check_decorator_1.SkipUserCheck)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get Dev Token (DEV ENV ONLY)' }),
    (0, swagger_1.ApiQuery)({ name: 'email', required: true }),
    __param(0, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DevAuthController.prototype, "getDevToken", null);
exports.DevAuthController = DevAuthController = __decorate([
    (0, swagger_1.ApiTags)('Dev Tools'),
    (0, common_1.Controller)('dev/auth'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        jwt_1.JwtService])
], DevAuthController);
//# sourceMappingURL=dev-auth.controller.js.map