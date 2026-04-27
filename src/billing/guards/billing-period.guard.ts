import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingStatusService } from '../services/billing-status.service';
import { BILLING_PERIOD_KEY, BillingPeriodMeta } from '../decorators/require-billing.decorator';

@Injectable()
export class BillingPeriodGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly billingStatusService: BillingStatusService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.get<BillingPeriodMeta>(BILLING_PERIOD_KEY, context.getHandler());
    if (!meta) return true;

    const req = context.switchToHttp().getRequest();
    const companyId = this.resolve(req, meta.companyIdPath);
    if (!companyId) throw new BadRequestException('companyId is required for billing validation');

    let periodEnd: Date;

    if (meta.kind === 'date') {
      const raw = this.resolve(req, meta.periodEndPath);
      if (!raw) throw new BadRequestException('periodEndDate is required for billing validation');
      periodEnd = new Date(raw);
    } else {
      const month = Number(this.resolve(req, meta.monthPath));
      const year = Number(this.resolve(req, meta.yearPath));
      if (!month || !year) throw new BadRequestException('month and year are required for billing validation');
      periodEnd = this.billingStatusService.periodEndFromMonthYear(month, year);
    }

    if (isNaN(periodEnd.getTime())) throw new BadRequestException('Invalid period date for billing validation');

    await this.billingStatusService.assertBillingForPeriodEnd(companyId, periodEnd);
    return true;
  }

  /** Resolve a dot-path like 'body.companyId' or 'body.0.periodEndDate' against req. */
  private resolve(req: any, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], req);
  }
}
