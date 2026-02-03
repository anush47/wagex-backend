import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PolicySettingsDto } from './dto/policy-settings.dto';
import { Policy } from '@prisma/client';
import { merge } from 'lodash';

@Injectable()
export class PoliciesService {
    private readonly logger = new Logger(PoliciesService.name);

    constructor(private readonly prisma: PrismaService) { }

    async create(createPolicyDto: CreatePolicyDto): Promise<Policy> {
        const { companyId, employeeId, settings } = createPolicyDto;

        // Safety check: Needs either company or employee context
        if (!companyId && !employeeId) {
            throw new Error('Policy must be attached to either a Company or an Employee');
        }

        /**
         * SCENARIO 1: Employee Override Policy
         * If employeeId is present, we are creating an override.
         * We MUST NOT save 'companyId' to the DB in this record, because 'companyId' in the Policy table
         * implies "This is the Default Policy for Company X", and that is unique.
         * The 'companyId' passed in the DTO is purely for Permission Guard validation.
         */
        if (employeeId) {
            // Check if override already exists, if so, update it (Upsert logic)
            return this.prisma.policy.upsert({
                where: { employeeId },
                update: { settings: settings as any },
                create: {
                    employeeId,
                    settings: settings as any,
                    // Do NOT set companyId here
                }
            });
        }

        /**
         * SCENARIO 2: Company Default Policy
         * If no employeeId, we are strictly defining the Company Default.
         * We use upsert here too, so "Create" acts as "Create or Update".
         */
        return this.prisma.policy.upsert({
            where: { companyId }, // Unique constraint
            update: { settings: settings as any },
            create: {
                companyId,
                settings: settings as any,
            }
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
        return this.prisma.policy.findUnique({ where: { companyId } });
    }

    async findByEmployee(employeeId: string) {
        return this.prisma.policy.findUnique({ where: { employeeId } });
    }

    async update(id: string, updatePolicyDto: UpdatePolicyDto) {
        return this.prisma.policy.update({
            where: { id },
            data: {
                settings: updatePolicyDto.settings as any,
            },
        });
    }

    async remove(id: string) {
        return this.prisma.policy.delete({ where: { id } });
    }

    /**
     * The Core Logic: Calculates the effective policy for an employee
     * by merging Company Defaults with Employee Overrides.
     */
    async getEffectivePolicy(employeeId: string): Promise<PolicySettingsDto> {
        // 1. Fetch Employee and their Company
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                policy: true,  // Employee Override
                company: {
                    include: {
                        policy: true // Company Default
                    }
                }
            }
        });

        if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

        // 2. Extract Policies
        const companyPolicy = (employee.company?.policy?.settings as unknown as PolicySettingsDto) || {};
        const employeeOverride = (employee.policy?.settings as unknown as PolicySettingsDto) || {};

        // 3. Deep Merge: Company Defaults <- Employee Overrides
        // Using lodash.merge for deep merging (arrays are concatenated or replaced depending on strategy, here we assume replacement for arrays if needed, but lodash merges objects deeply)
        // For shifts array, usually we want the employee's shifts to replace the company's if defined, or append?
        // In this "Pure JSON Setup", if an employee has 'shifts' defined, it should probably REPLACE the company list entirely to avoid confusion.
        // Lodash merge merges properties.

        const effectivePolicy = merge({}, companyPolicy, employeeOverride);

        // Special handling: If employee overrides 'shifts.list', we want to REPLACE the entire list,
        // not merge individual items by index (which lodash.merge does for arrays).
        if (employeeOverride.shifts?.list) {
            if (!effectivePolicy.shifts) effectivePolicy.shifts = {} as any;
            if (effectivePolicy.shifts) {
                effectivePolicy.shifts.list = employeeOverride.shifts.list;
            }
        }

        return effectivePolicy;
    }

    /**
     * Enhanced version that returns metadata about what was overridden.
     */
    async getEffectivePolicyDetail(employeeId: string) {
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                policy: true, // Employee Override
                company: {
                    include: {
                        policy: true // Company Default
                    }
                }
            }
        });

        if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

        const companyPolicy = (employee.company?.policy?.settings as unknown as PolicySettingsDto) || {};
        const employeeOverride = (employee.policy?.settings as unknown as PolicySettingsDto) || {};

        // Use the existing logic to get merged result
        const effectivePolicy = await this.getEffectivePolicy(employeeId);

        // Calculate "Diff" / Metadata
        // We check which keys exist in the employeeOverride object.
        const overriddenFields: string[] = [];
        if (employeeOverride.shifts) overriddenFields.push('shifts');
        if (employeeOverride.attendance) overriddenFields.push('attendance');
        if (employeeOverride.salaryComponents) overriddenFields.push('salaryComponents');

        return {
            effective: effectivePolicy,
            source: {
                isOverridden: !!employee.policy,
                overriddenFields,
                companyPolicyId: employee.company?.policy?.id,
                employeePolicyId: employee.policy?.id
            },
            // Return raw objects too for full transparency if needed
            companyPolicy,
            employeeOverride
        };
    }

    async removeByEmployee(employeeId: string) {
        const policy = await this.prisma.policy.findUnique({ where: { employeeId } });
        if (!policy) throw new NotFoundException("No override policy found for this employee");
        return this.remove(policy.id);
    }
}
