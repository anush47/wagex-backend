import { PoliciesService } from './policies.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
export declare class PoliciesController {
    private readonly policiesService;
    constructor(policiesService: PoliciesService);
    create(createPolicyDto: CreatePolicyDto): Promise<{
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
    getEffective(employeeId: string): Promise<{
        effective: import("./dto/policy-settings.dto").PolicySettingsDto;
        source: {
            isOverridden: boolean;
            overriddenFields: string[];
            companyPolicyId: string | undefined;
            employeePolicyId: string | undefined;
        };
        employee: {
            id: string;
        };
        companyPolicy: import("./dto/policy-settings.dto").PolicySettingsDto;
        employeeOverride: import("./dto/policy-settings.dto").PolicySettingsDto;
    }>;
    update(id: string, companyId: string, updatePolicyDto: UpdatePolicyDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        settings: import("@prisma/client/runtime/client").JsonValue;
        employeeId: string | null;
    }>;
    remove(id: string, companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        settings: import("@prisma/client/runtime/client").JsonValue;
        employeeId: string | null;
    }>;
    removeOverride(employeeId: string, companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string | null;
        settings: import("@prisma/client/runtime/client").JsonValue;
        employeeId: string | null;
    }>;
}
