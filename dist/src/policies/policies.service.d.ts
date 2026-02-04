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
        settings: import("@prisma/client/runtime/client").JsonValue;
        companyId: string | null;
        employeeId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        settings: import("@prisma/client/runtime/client").JsonValue;
        companyId: string | null;
        employeeId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findByCompany(companyId: string): Promise<{
        id: string;
        settings: import("@prisma/client/runtime/client").JsonValue;
        companyId: string | null;
        employeeId: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    findByEmployee(employeeId: string): Promise<{
        id: string;
        settings: import("@prisma/client/runtime/client").JsonValue;
        companyId: string | null;
        employeeId: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    update(id: string, updatePolicyDto: UpdatePolicyDto): Promise<{
        id: string;
        settings: import("@prisma/client/runtime/client").JsonValue;
        companyId: string | null;
        employeeId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        id: string;
        settings: import("@prisma/client/runtime/client").JsonValue;
        companyId: string | null;
        employeeId: string | null;
        createdAt: Date;
        updatedAt: Date;
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
        companyPolicy: PolicySettingsDto;
        employeeOverride: PolicySettingsDto;
    }>;
    removeByEmployee(employeeId: string): Promise<{
        id: string;
        settings: import("@prisma/client/runtime/client").JsonValue;
        companyId: string | null;
        employeeId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
