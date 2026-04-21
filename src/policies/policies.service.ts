import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PolicySettingsDto } from './dto/policy-settings.dto';
import { Policy } from '@prisma/client';
import { merge } from 'lodash';
import { DEFAULT_POLICY_SETTINGS } from './constants/default-policy.template';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(public readonly prisma: PrismaService) {}

  async create(createPolicyDto: CreatePolicyDto): Promise<Policy> {
    const { companyId, name, description, isDefault, settings } = createPolicyDto;

    // If this is set as default, we need to unset any existing default for this company
    if (isDefault) {
      await this.prisma.policy.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If no settings provided, use company default policy as template
    let finalSettings = settings;
    if (!settings || Object.keys(settings).length === 0) {
      const defaultPolicy = await this.getDefaultPolicy(companyId);
      if (defaultPolicy && defaultPolicy.settings) {
        finalSettings = defaultPolicy.settings as any;
      } else {
        // Fallback to global default template if no company default exists
        finalSettings = DEFAULT_POLICY_SETTINGS as any;
      }
    }

    return this.prisma.policy.create({
      data: {
        companyId,
        name,
        description,
        isDefault: !!isDefault,
        settings: finalSettings as any,
      },
    });
  }

  async findAll() {
    return this.prisma.policy.findMany();
  }

  async findOne(id: string) {
    const policy = await this.prisma.policy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException(`Policy ${id} not found`);
    return policy;
  }

  async findByCompany(companyId: string) {
    const policies = await this.prisma.policy.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });

    if (policies.length === 0) {
      // Create initial default policy with full template
      const defaultPolicy = await this.create({
        companyId,
        name: 'Company Default',
        isDefault: true,
        settings: DEFAULT_POLICY_SETTINGS as any,
      });
      return [defaultPolicy];
    }

    return policies;
  }

  async getDefaultPolicy(companyId: string) {
    try {
      const policy = await this.prisma.policy.findFirst({
        where: { companyId, isDefault: true },
      });

      if (!policy) {
        // Ensure at least one exists and is default
        const existingAny = await this.prisma.policy.findFirst({
          where: { companyId },
        });

        if (existingAny) {
          // Mark the first one as default if none is default
          return this.prisma.policy.update({
            where: { id: existingAny.id },
            data: { isDefault: true },
          });
        }

        // Create new default with full template
        return this.create({
          companyId,
          name: 'Company Default',
          isDefault: true,
          settings: DEFAULT_POLICY_SETTINGS as any,
        });
      }

      return policy;
    } catch (error) {
      this.logger.error(`Failed to get/create default policy for company ${companyId}`, error.stack);
      throw new InternalServerErrorException(`Unable to retrieve company policy settings`);
    }
  }

  async update(id: string, updatePolicyDto: UpdatePolicyDto) {
    const { isDefault, companyId } = updatePolicyDto;

    if (isDefault && companyId) {
      await this.prisma.policy.updateMany({
        where: { companyId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.policy.update({
      where: { id },
      data: {
        name: updatePolicyDto.name,
        description: updatePolicyDto.description,
        isDefault: updatePolicyDto.isDefault,
        settings: updatePolicyDto.settings as any,
      },
    });
  }

  async remove(id: string) {
    const policy = await this.prisma.policy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException(`Policy ${id} not found`);

    if (policy.isDefault) {
      // Check if there are other policies that could become default?
      const count = await this.prisma.policy.count({ where: { companyId: policy.companyId } });
      if (count > 1) {
        // Not ideal, but we let it happen or prompt user in frontend to set another as default.
      }
    }

    return this.prisma.policy.delete({ where: { id } });
  }

  /**
   * Resolves the effective policy for an employee.
   * Logic: Default Company Policy <- (Merged with) Assigned Policy Template.
   */
  async getEffectivePolicy(employeeId: string): Promise<PolicySettingsDto> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        companyId: true,
        policyId: true,
        policy: {
          select: {
            settings: true,
          },
        },
      },
    });

    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    // 1. Get Company Default
    const defaultPolicy = await this.getDefaultPolicy(employee.companyId);
    const companySettings = (defaultPolicy?.settings as unknown as PolicySettingsDto) || {};

    // 2. Get Assigned Template
    const assignedSettings = (employee.policy?.settings as unknown as PolicySettingsDto) || {};

    // 3. Merge: Default <- Assigned
    return this.mergeEffectivePolicy(companySettings, assignedSettings);
  }

  /**
   * Detail view of effective policy resolution
   */
  async getEffectivePolicyDetail(employeeId: string) {
    this.logger.log(`Resolving effective policy detail for employee: ${employeeId}`);

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        fullName: true,
        companyId: true,
        policyId: true,
        policy: {
          select: {
            id: true,
            name: true,
            settings: true,
          },
        },
      },
    });

    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    // Use getDefaultPolicy so the same auto-create/promote fallback applies as in getEffectivePolicy
    const defaultPolicy = await this.getDefaultPolicy(employee.companyId);

    const companySettings =
      defaultPolicy?.settings && typeof defaultPolicy.settings === 'object'
        ? (defaultPolicy.settings as unknown as PolicySettingsDto)
        : ({} as PolicySettingsDto);

    const assignedSettings =
      employee.policy?.settings && typeof employee.policy.settings === 'object'
        ? (employee.policy.settings as unknown as PolicySettingsDto)
        : ({} as PolicySettingsDto);

    const effective = this.mergeEffectivePolicy(companySettings, assignedSettings);

    return {
      effective,
      source: {
        hasAssignedPolicy: !!employee.policyId,
        assignedPolicyName: employee.policy?.name,
        defaultPolicyId: defaultPolicy?.id,
        assignedPolicyId: employee.policyId,
      },
      employee: {
        id: employee.id,
        name: employee.fullName,
      },
      companyDefault: companySettings,
      assignedTemplate: assignedSettings,
    };
  }

  /**
   * Efficiently resolves effective policies for multiple employees in bulk.
   */
  async resolveBulkPolicies(employeeIds: string[]): Promise<Map<string, PolicySettingsDto>> {
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      include: {
        policy: true, // Assigned template
      },
    });

    const companyIds = [...new Set(employees.map((e) => e.companyId))];
    const defaultPolicies = await this.prisma.policy.findMany({
      where: { companyId: { in: companyIds }, isDefault: true },
    });

    const companyPolicyMap = new Map(
      defaultPolicies.map((p) => [p.companyId, (p.settings as unknown as PolicySettingsDto) || {}]),
    );

    const result = new Map<string, PolicySettingsDto>();

    for (const employee of employees) {
      const companySettings = companyPolicyMap.get(employee.companyId) || {};
      const assignedSettings = (employee.policy?.settings as unknown as PolicySettingsDto) || {};

      const effective = this.mergeEffectivePolicy(companySettings, assignedSettings);
      result.set(employee.id, effective);
    }

    return result;
  }

  /**
   * Internal merging logic for policies
   */
  private mergeEffectivePolicy(
    companySettings: PolicySettingsDto,
    assignedSettings: PolicySettingsDto,
  ): PolicySettingsDto {
    try {
      // 1. Shallow copy to avoid mutating inputs
      // 2. Merge: Default <- Assigned
      // We use lodash merge to combine objects deeply
      const effectivePolicy = merge({}, companySettings, assignedSettings);

      // Explicitly replace arrays from assigned settings if they exist to prevent index-based merging
      if (assignedSettings.shifts?.list) {
        (effectivePolicy as any).shifts = { ...effectivePolicy.shifts, list: assignedSettings.shifts.list };
      }
      if (assignedSettings.payrollConfiguration?.otRules) {
        (effectivePolicy as any).payrollConfiguration = {
          ...effectivePolicy.payrollConfiguration,
          otRules: assignedSettings.payrollConfiguration.otRules,
        };
      }
      if (assignedSettings.salaryComponents?.components) {
        (effectivePolicy as any).salaryComponents = {
          ...effectivePolicy.salaryComponents,
          components: assignedSettings.salaryComponents.components,
        };
      }
      if (assignedSettings.leaves?.leaveTypes) {
        (effectivePolicy as any).leaves = { ...effectivePolicy.leaves, leaveTypes: assignedSettings.leaves.leaveTypes };
      }

      return effectivePolicy;
    } catch (error) {
      this.logger.error('Policy merging failed', error.stack);
      throw new InternalServerErrorException('Failed to merge policy settings');
    }
  }
}
