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
                active: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                address: string | null;
                employerNumber: string | null;
                startedDate: Date | null;
                logo: string | null;
                files: import("@prisma/client/runtime/client").JsonValue | null;
            };
        } & {
            role: import("@prisma/client").$Enums.Role;
            id: string;
            permissions: import("@prisma/client/runtime/client").JsonValue | null;
            active: boolean;
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
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
    }) | {
        isGuest: boolean;
        email: any;
        sub: any;
        roles: never[];
    }>;
}
export {};
