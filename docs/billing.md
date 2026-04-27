# Billing System

## Overview

Companies pay a monthly subscription to use Wagex. Billing is manual — there is no automatic charging. Employers purchase calendar months, upload a bank transfer slip, and an admin approves. Suspension is also manual and admin-only.

---

## Data Models

### `CompanyBilling`

One row per company, plus one shared "default" row (`isDefault = true`, `companyId = null`).

| Field | Type | Description |
|---|---|---|
| `companyId` | String? unique | null = default template |
| `isDefault` | Boolean | true for the global default row |
| `basePriceLkr` | Decimal | flat monthly fee |
| `employeeTiers` | Json | `[{ upTo: number, priceLkr: number }]` — tiered pricing |
| `services` | Json | `[{ name: string, priceLkr: number, active: boolean }]` — addons |
| `multiMonthDiscounts` | Json | `[{ months: number, discountPct: number }]` — bulk purchase discounts |
| `employeeCount` | Int | cached active employee count (synced on hire/fire/status change) |
| `overrideActive` | Boolean | when true, disables automatic employee count syncing |
| `gracePeriodMonths` | Int | tolerance window before suspension (referenced in status messages) |
| `suspensionLevel` | Enum | `NONE \| PORTAL \| ALL` |

Companies without a custom row inherit from the default **live** — changes to the default immediately affect all non-overridden companies.

### `PaymentInvoice`

One row per company per billing month. `@@unique([companyId, billingPeriod])`.

| Field | Type | Description |
|---|---|---|
| `billingPeriod` | String | `YYYY-MM` e.g. `"2025-01"` |
| `status` | Enum | `UNPAID \| PENDING \| PAID \| SKIPPED \| FREE` |
| `employeeCountSnap` | Int | snapshot at purchase time |
| `basePriceLkr` | Decimal | base price at purchase time |
| `addonPriceLkr` | Decimal | addon sum at purchase time |
| `discountLkr` | Decimal | discount applied |
| `totalLkr` | Decimal | final amount due |
| `slipUrl` | String? | R2 key of the uploaded payment slip |
| `uploadedByUserId` | String? | who uploaded the slip |
| `reviewedByUserId` | String? | admin who approved/rejected |
| `rejectionReason` | String? | set on rejection; cleared on re-upload |
| `paidAt` | DateTime? | set on approval |

---

## Invoice Lifecycle

```
Employer selects months → UNPAID invoices created
         ↓
Employer uploads bank slip → all selected UNPAID → PENDING
         ↓
Admin approves → PAID   (paidAt recorded, slip kept)
Admin rejects  → UNPAID (rejectionReason set, slipUrl cleared — employer must re-upload)
         ↓
Admin can also set any invoice to SKIPPED or FREE directly
```

**Rules:**
- Maximum 12 months per purchase batch
- Only one pending batch allowed at a time per company — a second slip upload is blocked while any invoice is `PENDING`
- An employer can have at most 2 `UNPAID` invoices before admin is alerted (no auto-suspend)

---

## Pricing Calculation

`InvoiceService.calculatePrice(billing, monthCount)`:

1. **Base price** — if `employeeTiers` is empty, use `basePriceLkr` flat. Otherwise find the first tier where `employeeCount <= tier.upTo`; if count exceeds all tiers, use the last tier's price.
2. **Addons** — sum `priceLkr` of all services where `active = true`.
3. **Subtotal** — `(base + addons) × monthCount`.
4. **Discount** — from all `multiMonthDiscounts` where `monthCount >= d.months`, take the one with the highest `months` value. Applied as percentage of subtotal.
5. **Distribution** — total divided equally across periods with `Math.floor`; last period absorbs rounding remainder.

Default discount schedule (seeded on first run): 3 months = 5%, 6 months = 10%, 12 months = 15%.

---

## Suspension

Set manually by admin on `CompanyBilling.suspensionLevel`.

| Level | Effect |
|---|---|
| `NONE` | Full access |
| `PORTAL` | Employer portal write operations (`POST/PUT/PATCH/DELETE`) return `423 Locked`. GET reads still work. Billing routes are always writable (so company can still pay). |
| `ALL` | Same as `PORTAL` at HTTP level. Additionally, external API key attendance verification is blocked in `AttendanceExternalService.verifyApiKey()`. Employee portal (employee-facing reads) is unaffected. |

The `BillingGuard` enforces suspension. It is applied globally to employer-facing controllers.

---

## Billing Period Guard — Purchase Before Generate

Endpoints that generate financial records require the company to have a purchased invoice for the relevant billing month.

**Logic (`BillingStatusService.assertBillingForPeriodEnd`):**
1. Take the `periodEndDate` of the salary/EPF/ETF being generated.
2. Expand by ±15 days to handle periods straddling month boundaries.
3. Enumerate all `YYYY-MM` months in that window.
4. Check if the company has any invoice for those months with status `UNPAID`, `PENDING`, `PAID`, `FREE`, or `SKIPPED`.
5. Throw `403 Forbidden` if none found.

**Example:** Salary for Dec 20 – Jan 20 → window Dec 5 – Feb 4 → checks Dec 2024, Jan 2025, Feb 2025. Any invoice in UNPAID/PENDING/PAID/FREE/SKIPPED for any of those months satisfies the check.

**Applied via `@RequiresBilling()` decorator + `BillingPeriodGuard`:**

| Endpoint | companyId source | period source |
|---|---|---|
| `POST /salaries/generate-preview` | `body.companyId` | `body.periodEndDate` |
| `POST /salaries/save-drafts/:companyId` | `params.companyId` | `body[0].employees[0].periodEndDate` |
| `POST /companies/:id/epf/preview` | `params.companyId` | last day of `body.month`/`body.year` |
| `POST /companies/:id/epf` | `params.companyId` | last day of `body.month`/`body.year` |
| `POST /companies/:id/etf/preview` | `params.companyId` | last day of `body.month`/`body.year` |
| `POST /companies/:id/etf` | `params.companyId` | last day of `body.month`/`body.year` |

**Document rendering** (`GET /templates/render/:templateId/:resourceId`): checked inside `TemplatesService.render()` since the period must be resolved from the resource (salary DB lookup for `PAYSLIP`, resourceId parsing for `SALARY_SHEET`).

---

## Auto-Draft Billing Integration

`SalaryAutomationService.handleAutoDraftGeneration()` runs nightly. For each company with `enableAutoDraft = true`:

1. Checks if today is the trigger day (pay day minus `draftCreationDaysBeforePayDay` days).
2. Calls `ensureBillingForPeriod(companyId, periodEnd)`:
   - If a valid invoice exists → proceed.
   - If no invoice exists and `UNPAID + PENDING < 2` → auto-creates an `UNPAID` invoice for the billing month (`format(periodEnd, 'yyyy-MM')`), then proceeds.
   - If `UNPAID + PENDING >= 2` → logs a warning and skips this company.

This means companies with auto-draft enabled get invoices created automatically, but those invoices still need to be paid by the employer.

---

## Employee Count Sync

`BillingConfigService.syncEmployeeCount(companyId)` is called fire-and-forget from `EmployeesService` when:
- An employee is created
- An employee's `status` field changes (e.g. activation/termination)
- An employee is deleted

The sync is skipped if:
- The company has no custom config (uses default → employee count is always fetched live for pricing)
- `overrideActive = true` on the company's billing config

Admin can bypass `overrideActive` via `POST /admin/billing/companies/:id/recalculate`.

---

## API Reference

### Employer (`/billing`, role: EMPLOYER)

| Method | Path | Description |
|---|---|---|
| GET | `/billing/config?companyId=` | Effective billing config (custom or default) |
| GET | `/billing/status?companyId=` | Suspension level, unpaid count, warnings |
| GET | `/billing/invoices?companyId=` | Invoice history |
| POST | `/billing/invoices/preview` | Price preview before purchasing |
| POST | `/billing/invoices` | Purchase months (create UNPAID invoices) |
| POST | `/billing/invoices/slip` | Upload payment slip (multipart: file, companyId, invoiceIds JSON array) |

### Admin (`/admin/billing`, role: ADMIN)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/billing/default` | Get default template |
| PATCH | `/admin/billing/default` | Update default template |
| POST | `/admin/billing/seed-default` | Seed default config if none exists |
| GET | `/admin/billing/companies` | List all companies with billing status |
| GET | `/admin/billing/companies/:id` | Company billing config |
| PATCH | `/admin/billing/companies/:id` | Update company config |
| POST | `/admin/billing/companies/:id/create-custom` | Copy default → company-specific config |
| POST | `/admin/billing/companies/:id/recalculate` | Force-sync employee count |
| GET | `/admin/billing/companies/:id/status` | Company billing status |
| GET | `/admin/billing/invoices` | All invoices (filter by companyId/status/period) |
| POST | `/admin/billing/invoices/review` | Approve or reject PENDING invoices |
| PATCH | `/admin/billing/invoices/:id/status` | Set invoice to SKIPPED or FREE |
| POST | `/admin/billing/invoices/slip` | Upload slip on behalf of a company |
