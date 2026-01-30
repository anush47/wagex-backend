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
    validate(payload: any): Promise<{
        email: string;
        role: import("@prisma/client").$Enums.Role;
        companyId: string | null;
        id: string;
        nameWithInitials: string | null;
        fullName: string | null;
        address: string | null;
        phone: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | {
        isGuest: boolean;
        email: any;
        supabaseUid: any;
        roles: never[];
    }>;
}
export {};
