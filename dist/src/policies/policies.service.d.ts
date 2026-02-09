import { PrismaService } from '../prisma/prisma.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PolicySettingsDto } from './dto/policy-settings.dto';
import { Policy } from '@prisma/client';
export declare class PoliciesService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(createPolicyDto: CreatePolicyDto): Promise<Policy>;
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        settings: import("@prisma/client/runtime/client").JsonValue;
        employeeId: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        settings: import("@prisma/client/runtime/client").JsonValue;
        employeeId: string | null;
    }>;
    findByCompany(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        settings: import("@prisma/client/runtime/client").JsonValue;
        employeeId: string | null;
    } | null>;
    findByEmployee(employeeId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        settings: import("@prisma/client/runtime/client").JsonValue;
        employeeId: string | null;
    } | null>;
    update(id: string, updatePolicyDto: UpdatePolicyDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        settings: import("@prisma/client/runtime/client").JsonValue;
        employeeId: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        settings: import("@prisma/client/runtime/client").JsonValue;
        employeeId: string | null;
    }>;
    getEffectivePolicy(employeeId: string): Promise<PolicySettingsDto>;
    getEffectivePolicyDetail(employeeId: string): Promise<{
        effective: PolicySettingsDto;
        source: {
            isOverridden: boolean;
            overriddenFields: string[];
            companyPolicyId: string | undefined;
            employeePolicyId: string | undefined;
        };
        employee: {
            id: string;
            calendarId: string | null;
        };
        companyPolicy: PolicySettingsDto;
        employeeOverride: PolicySettingsDto;
    }>;
    removeByEmployee(employeeId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        settings: import("@prisma/client/runtime/client").JsonValue;
        employeeId: string | null;
    }>;
}
