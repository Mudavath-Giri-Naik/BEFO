/**
 * Membership billing: periods, due dates and status. Mirrors SQL (member_overview, payment functions).
 * See docs/FINANCE_RULES.md §Billing.
 */
import { addDays, addPeriod, diffDays, type ISODate, type PeriodUnit } from "./dates"

export type DueRule = "from_payment_date" | "from_previous_due"

export interface PlanPeriod {
  period_unit: PeriodUnit
  period_count: number
}

/**
 * Period covered by a new subscription payment.
 *  - from_payment_date (mess default): start = paid_on
 *  - from_previous_due (hostel default): start = previous due_on, else billing_start, else paid_on
 * end = start + plan interval. The member is valid THROUGH `end` (inclusive).
 */
export function computePeriod(args: {
  rule: DueRule
  plan: PlanPeriod
  paidOn: ISODate
  previousDue?: ISODate | null
  billingStart?: ISODate | null
  periods?: number
}): { start: ISODate; end: ISODate } {
  const { rule, plan, paidOn } = args
  const n = args.periods ?? 1
  let start: ISODate
  if (rule === "from_payment_date") start = paidOn
  else start = args.previousDue ?? args.billingStart ?? paidOn
  const end = addPeriod(start, plan.period_unit, plan.period_count * n)
  return { start, end }
}

export type SubStatus = "removed" | "former" | "paused" | "no_payment" | "expired" | "expiring_soon" | "active"

export interface StatusInput {
  today: ISODate
  dueOn: ISODate | null
  hasSubscriptionPayment: boolean
  removedAt?: string | null
  leftOn?: ISODate | null
  pausedAt?: string | null
  graceDays?: number
  expiringSoonDays?: number
}

/** Order matters: removed > former > paused > no_payment > expired > expiring_soon > active. */
export function deriveStatus(i: StatusInput): { status: SubStatus; daysLeft: number | null } {
  const grace = i.graceDays ?? 0
  const soon = i.expiringSoonDays ?? 3
  const daysLeft = i.dueOn ? diffDays(i.today, i.dueOn) : null
  if (i.removedAt) return { status: "removed", daysLeft }
  if (i.leftOn && i.leftOn <= i.today) return { status: "former", daysLeft }
  if (i.pausedAt) return { status: "paused", daysLeft }
  if (!i.hasSubscriptionPayment || !i.dueOn) return { status: "no_payment", daysLeft }
  if (i.today > addDays(i.dueOn, grace)) return { status: "expired", daysLeft }
  if (daysLeft !== null && daysLeft <= soon) return { status: "expiring_soon", daysLeft }
  return { status: "active", daysLeft }
}

/** due_on = max(period_end) of non-voided subscription/extension payments, else billing_start. */
export function dueOnFrom(payments: { period_end: ISODate | null; voided_at?: string | null; kind: string }[], billingStart: ISODate | null): ISODate | null {
  let best: ISODate | null = null
  for (const p of payments) {
    if (p.voided_at || !p.period_end) continue
    if (p.kind !== "subscription" && p.kind !== "extension") continue
    if (!best || p.period_end > best) best = p.period_end
  }
  return best ?? billingStart
}

/** Reminder ladder for customers: 3 days before, due day, +2 days. */
export function reminderStep(today: ISODate, dueOn: ISODate): "before_3" | "due_day" | "after_2" | null {
  const d = diffDays(today, dueOn)
  if (d === 3) return "before_3"
  if (d === 0) return "due_day"
  if (d === -2) return "after_2"
  return null
}
