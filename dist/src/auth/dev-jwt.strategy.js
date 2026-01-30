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
exports.DevJwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let DevJwtStrategy = class DevJwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'jwt-dev') {
    configService;
    prisma;
    constructor(configService, prisma) {
        const secret = configService.get('DEV_JWT_SECRET');
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret || 'dev-secret-fallback',
        });
        this.configService = configService;
        this.prisma = prisma;
    }
    async validate(payload) {
        const env = this.configService.get('ENVIRONMENT');
        if (env !== 'dev') {
            throw new common_1.UnauthorizedException('Dev Strategy disabled in non-dev environment');
        }
        if (!payload || !payload.email) {
            throw new common_1.UnauthorizedException('Invalid Dev Token');
        }
        const { email } = payload;
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return {
                isGuest: true,
                email,
                sub: payload.sub,
                roles: []
            };
        }
        if (!user.active) {
            throw new common_1.UnauthorizedException('User inactive');
        }
        return user;
    }
};
exports.DevJwtStrategy = DevJwtStrategy;
exports.DevJwtStrategy = DevJwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], DevJwtStrategy);
//# sourceMappingURL=dev-jwt.strategy.js.map