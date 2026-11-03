# Finance rules

Code: `src/lib/{money,dates,billing,payroll,finance}.ts` (unit-tested in `tests/unit`) and the SQL functions in
`supabase/migrations`. The LLM never computes totals; it may only narrate numbers it is given.

## Units and rounding
- Money is stored as **paise `bigint`**. Displayed as rupees with Indian grouping, `.00` hidden (`₹2,300`, `₹2,300.50`).
- Rounding: half up to whole paise. **Salaries round to whole rupees** (half up).
- Amount parsing accepts `₹`, `Rs.`, `INR`, commas, `/-`, `lakh`/`crore`.

## Dates
- Business dates use `Asia/Kolkata` via `tenant_today()` / `tenantToday()`.
- Month arithmetic follows Postgres `date + interval`: 31 Jan + 1 month = 28 Feb (29 in leap years); the clamp carries forward (28 Feb + 1 month = 28 Mar).
- User-typed dates are day-first only (`DD/MM/YYYY`), or Excel serials. Month-first is never guessed.

## Billing
- One recurring plan per member plus one-time charges (deposit / fee / penalty).
- `from_payment_date` (mess default): a payment's period starts on the payment date.
- `from_previous_due` (hostel default): starts at the previous due date, else `billing_start`, else the payment date. Arrears are therefore kept.
- Period end = start + plan interval × periods. The member is valid **through** the due date. `grace_days` default 0.
- `due_on` = latest `period_end` of non-voided subscription/extension payments, else `billing_start`.
- Status order: removed → former → paused → no_payment → expired → expiring_soon (≤ `expiring_soon_days`, default 3) → active.
- Customer reminders: 3 days before, due day, 2 days after.

## Ledger
- One append-only `transactions` table. Rows are never deleted; confirmed amounts never change. Voiding sets `status = void`.
- A payment and its transaction are created together in one SQL function (`_record_member_payment`).
- **Income** = confirmed member payments + other income (refunds reduce it). **Deposits are liabilities**, not income.
- **Operating expenses** = expenses + salaries (refunds/credit notes reduce them). Advances are not expenses.
- **Operating profit** = income − operating expenses. **Cash profit** = operating profit − investments.
- Transfers, owner draws and adjustments are not P&L.
- `finance_month_summary` is updated by trigger on every transaction insert/update.
- Duplicate detection order: same UTR → same file hash → same party + amount within ±3 days.
- Category resolution: owner's chip > vendor default > recurring rule > AI suggestion > uncategorised.
- Cash check: expected = opening + cash in − cash out; the difference is recorded, never auto-fixed.

## Salaries
- Monthly: `rate × payable_days / divisor`, rounded to whole rupees.
  - `calendar_days`: divisor = days in the month.
  - `fixed_30`: divisor 30; a full month counts as 30 days.
  - `working_days`: divisor = days in the month minus weekly offs; weekly offs are never payable days.
- Payable days = employed days (join/leave inclusive) − unpaid absences (half day = 0.5) − unpaid weekly offs. Paid leave is not deducted. Absences on weekly offs or outside employment are ignored.
- Daily wage: `rate × days present` (everyone present unless an absence is logged).
- Adjustments: bonus/overtime add, deductions subtract, advance recovery subtracts up to what is left; the rest carries to the next payout. Net never below zero.
- Example (tested): ₹12,000/month, joined 10 Nov, 30-day month → 21 days → **₹8,400**, paid 1 Dec.

## Platform pricing (home page) — `src/features/marketing/pricing.ts`
- Prices are paise `bigint`. Yearly billing charges **10 months for 12** (`YEARLY_MONTHS_CHARGED`); saving = 12 × monthly − yearly.
- "Per month, billed yearly" = yearly ÷ 12, rounded to the nearest rupee (half up). Tested: ₹499 → ₹416, ₹999 → ₹833, ₹1,999 → ₹1,666.
