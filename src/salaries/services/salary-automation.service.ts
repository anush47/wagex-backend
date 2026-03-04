import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SalaryEngineService } from './salary-engine.service';
import { PoliciesService } from '../../policies/policies.service';
import { PayCycleFrequency } from '../../policies/dto/payroll-settings-policy.dto';
import { subDays, startOfMonth, endOfMonth, addMonths, subMonths, addDays, isSameDay } from 'date-fns';

@Injectable()
export class SalaryAutomationService {
    private readonly logger = new Logger(SalaryAutomationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly salaryEngine: SalaryEngineService,
        private readonly policiesService: PoliciesService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleAutoDraftGeneration() {
        this.logger.log('Starting automated salary draft generation check...');

        // 1. Get all companies
        const companies = await this.prisma.company.findMany({
            where: { active: true },
        });

        for (const company of companies) {
            try {
                // 2. Get Default Policy for Company (To check global payroll automation)
                const defaultPolicy = await this.policiesService.getDefaultPolicy(company.id);
                const settings = (defaultPolicy.settings as any)?.payrollConfiguration;

                if (!settings || !settings.enableAutoDraft) continue;

                const today = new Date();
                const payDay = this.calculatePayDay(today, settings.runDay);

                if (!payDay) continue;

                const triggerDay = subDays(payDay, settings.draftCreationDaysBeforePayDay || 3);

                if (isSameDay(today, triggerDay)) {
                    this.logger.log(`Triggering auto-draft for company: ${company.name}`);

                    // Determine Period
                    const { start, end } = this.determinePeriod(payDay, settings);

                    const previews = await this.salaryEngine.bulkGenerate(company.id, start, end);
                    await this.salaryEngine.saveDrafts(company.id, previews);

                    this.logger.log(`Successfully generated auto-drafts for ${company.name}`);
                }
            } catch (error) {
                this.logger.error(`Error in auto-draft for company ${company.name}:`, error);
            }
        }
    }

    private calculatePayDay(reference: Date, runDay: string): Date | null {
        if (runDay === 'LAST') {
            return endOfMonth(reference);
        }

        const day = parseInt(runDay);
        if (isNaN(day)) return null;

        const date = new Date(reference.getFullYear(), reference.getMonth(), day);
        return date;
    }

    private determinePeriod(payDay: Date, settings: any) {
        // Respect Cutoff Days
        // Example: PayDay 30th, Cutoff 5 days before = 25th.
        // Period End = 25th of current cycle.
        // Period Start = 26th of previous cycle.

        const cutoffDays = settings.cutoffDaysBeforePayDay || 0;
        const periodEnd = subDays(payDay, cutoffDays);

        // For simplified monthly matching:
        // Period Start is 1 day after the previous cycle's end.
        const prevPayDay = subMonths(payDay, 1);
        const prevPeriodEnd = subDays(prevPayDay, cutoffDays);
        const periodStart = addDays(prevPeriodEnd, 1);

        return { start: periodStart, end: periodEnd };
    }
}
