import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SalaryEngineService } from './salary-engine.service';
import { SalariesService } from '../salaries.service';
import { PoliciesService } from '../../policies/policies.service';
import { subDays, endOfMonth, subMonths, subWeeks, addDays, isSameDay, getDaysInMonth } from 'date-fns';
import { PayCycleFrequency, PayrollSettingsConfigDto } from '../../policies/dto/payroll-settings-policy.dto';
import { PolicySettingsDto } from '../../policies/dto/policy-settings.dto';
import { SalaryGroupPreview } from '../interfaces/salary-calculation.interface';

@Injectable()
export class SalaryAutomationService {
  private readonly logger = new Logger(SalaryAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly salaryEngine: SalaryEngineService,
    private readonly salariesService: SalariesService,
    private readonly policiesService: PoliciesService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutoDraftGeneration() {
    this.logger.log('Starting automated salary draft generation check...');

    const companies = await this.prisma.company.findMany({
      where: { active: true },
    });

    for (const company of companies) {
      try {
        const defaultPolicy = await this.policiesService.getDefaultPolicy(company.id);
        const policySettings = defaultPolicy.settings as unknown as PolicySettingsDto;
        const settings = policySettings?.payrollConfiguration;

        if (!settings || !settings.enableAutoDraft) continue;

        const today = new Date();
        const payDay = this.calculatePayDay(today, settings.runDay);

        if (!payDay) continue;

        const triggerDay = subDays(payDay, (settings.draftCreationDaysBeforePayDay as number) || 3);

        if (isSameDay(today, triggerDay)) {
          this.logger.log(`Triggering auto-draft for company: ${company.name}`);

          const { start, end } = this.determinePeriod(payDay, settings);

          const previews = await this.salaryEngine.bulkGenerate(
            company.id,
            start,
            end,
            undefined,
            undefined,
            undefined,
            payDay,
          );
          const groupPreviews: SalaryGroupPreview[] = previews.map((p: any) => ({
            ...p,
            companyId: company.id,
          }));
          await this.salariesService.saveDrafts(company.id, groupPreviews);

          this.logger.log(`Successfully generated auto-drafts for ${company.name}`);
        }
      } catch (error: any) {
        this.logger.error(`Error in auto-draft for company ${company.name}: ${error.message as string}`);
      }
    }
  }

  private calculatePayDay(reference: Date, runDay: string): Date | null {
    if (runDay === 'LAST') {
      return endOfMonth(reference);
    }

    const day = parseInt(runDay);
    if (isNaN(day)) return null;

    const year = reference.getFullYear();
    const month = reference.getMonth();
    // Clamp to the last day of the month to avoid overflow (e.g. runDay=31 in April)
    const clampedDay = Math.min(day, getDaysInMonth(new Date(year, month)));
    return new Date(year, month, clampedDay);
  }

  private determinePeriod(payDay: Date, settings: PayrollSettingsConfigDto) {
    const cutoffDays = settings.cutoffDaysBeforePayDay || 0;
    const periodEnd = subDays(payDay, cutoffDays);

    let prevPeriodEnd: Date;
    switch (settings.frequency) {
      case PayCycleFrequency.WEEKLY:
        prevPeriodEnd = subDays(periodEnd, 7);
        break;
      case PayCycleFrequency.BI_WEEKLY:
        prevPeriodEnd = subDays(periodEnd, 14);
        break;
      case PayCycleFrequency.SEMI_MONTHLY:
        prevPeriodEnd = subDays(periodEnd, 15);
        break;
      case PayCycleFrequency.MONTHLY:
      default: {
        const prevPayDay = subMonths(payDay, 1);
        prevPeriodEnd = subDays(prevPayDay, cutoffDays);
        break;
      }
    }

    const periodStart = addDays(prevPeriodEnd, 1);
    return { start: periodStart, end: periodEnd };
  }
}
