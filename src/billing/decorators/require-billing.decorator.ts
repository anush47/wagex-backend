import { SetMetadata } from '@nestjs/common';

export const BILLING_PERIOD_KEY = 'billing:period';

/**
 * Describes how the guard should locate companyId and the period end date
 * from the current request.
 *
 * Paths use dot-notation relative to the `req` object, e.g.:
 *   'body.companyId', 'params.companyId', 'body.periodEndDate'
 *
 * For array bodies (save-drafts), use 'body.0.periodEndDate' to read
 * the first element.
 *
 * For EPF/ETF which supply month + year, use kind 'monthYear'.
 */
export type BillingPeriodMeta =
  | { companyIdPath: string; kind: 'date'; periodEndPath: string }
  | { companyIdPath: string; kind: 'monthYear'; monthPath: string; yearPath: string };

export const RequiresBilling = (meta: BillingPeriodMeta) =>
  SetMetadata(BILLING_PERIOD_KEY, meta);
