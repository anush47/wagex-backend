import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
declare const SupabaseStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class SupabaseStrategy extends SupabaseStrategy_base {
    private readonly configService;
    private readonly prisma;
    constructor(configService: ConfigService, prisma: PrismaService);
    validate(payload: any): Promise<({
        memberships: ({
            company: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                active: boolean;
            };
        } & {
            role: import("@prisma/client").$Enums.Role;
            id: string;
            permissions: import("@prisma/client/runtime/client").JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            companyId: string;
        })[];
        employees: {
            id: string;
            companyId: string;
        }[];
    } & {
        role: import("@prisma/client").$Enums.Role;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        active: boolean;
    }) | {
        isGuest: boolean;
        email: any;
        sub: any;
        roles: never[];
    }>;
}
export {};
