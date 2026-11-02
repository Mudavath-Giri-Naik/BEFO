/**
 * Employee pay. Pure function shared by the UI, tests and (mirrored) SQL compute_payout.
 * See docs/FINANCE_RULES.md §Salaries. Example: ₹12,000/month, joined 10 Nov (30-day month),
 * calendar_days → 21 payable days → 12,000 × 21 / 30 = ₹8,400.
 */
import { eachDay, maxDate, minDate, monthBounds, weekday, type ISODate } from "./dates"
import { roundDiv, roundToRupee } from "./money"

export type ProrationRule = "calendar_days" | "fixed_30" | "working_days"
export type AbsenceKind = "full" | "half" | "paid_leave"

export interface EmployeePayInput {
  pay_type: "monthly" | "daily"
  rate_paise: bigint
  proration_rule: ProrationRule
  joined_on: ISODate
  left_on?: ISODate | null
  weekly_off: number[] // 0 = Sunday
  weekly_off_paid: boolean
}

export interface PayAdjustment {
  kind: "bonus" | "overtime" | "deduction" | "advance_recovery"
  amount_paise: bigint // positive number; sign comes from kind
  ref?: string
}

export interface PayoutBreakdown {
  month: string
  employed: boolean
  days_in_month: number
  employed_days: number
  weekly_off_days: number
  unpaid_absence_days: number // half day = 0.5
  payable_days: number
  divisor: number
  gross_paise: bigint
  additions_paise: bigint
  deductions_paise: bigint
  advance_recovered_paise: bigint
  advance_carried_paise: bigint // recovery that did not fit, stays outstanding
  net_paise: bigint
}

/** Half-days are tracked as integer "halves" to keep the maths exact. */
export function computePayout(
  emp: EmployeePayInput,
  month: string,
  absences: { date: ISODate; kind: AbsenceKind }[] = [],
  adjustments: PayAdjustment[] = [],
): PayoutBreakdown {
  const { start, end, days } = monthBounds(month)
  const from = maxDate(start, emp.joined_on)
  const to = emp.left_on ? minDate(end, emp.left_on) : end
  const employed = from <= to
  const employedDays = employed ? eachDay(from, to) : []
  const isOff = (d: ISODate) => emp.weekly_off.includes(weekday(d))
  const offDays = employedDays.filter(isOff).length

  const absenceByDate = new Map<ISODate, AbsenceKind>()
  for (const a of absences) absenceByDate.set(a.date, a.kind)
  // unpaid absences only count on employed, non-off days
  let unpaidHalves = 0
  for (const d of employedDays) {
    if (isOff(d)) continue
    const k = absenceByDate.get(d)
    if (k === "full") unpaidHalves += 2
    else if (k === "half") unpaidHalves += 1
  }

  let payableHalves: number
  let divisor: number
  if (emp.pay_type === "daily") {
    divisor = 1
    const base = employedDays.length - (emp.weekly_off_paid ? 0 : offDays)
    payableHalves = base * 2 - unpaidHalves
  } else if (emp.proration_rule === "working_days") {
    const allDays = eachDay(start, end)
    divisor = allDays.filter((d) => !isOff(d)).length
    payableHalves = (employedDays.length - offDays) * 2 - unpaidHalves
  } else {
    divisor = emp.proration_rule === "fixed_30" ? 30 : days
    let baseDays = employedDays.length
    if (emp.proration_rule === "fixed_30") baseDays = employedDays.length === days ? 30 : Math.min(30, employedDays.length)
    const offDeduct = emp.weekly_off_paid ? 0 : offDays
    payableHalves = (baseDays - offDeduct) * 2 - unpaidHalves
  }
  payableHalves = Math.max(0, payableHalves)

  let gross = 0n
  if (employed && divisor > 0) {
    gross = roundToRupee(roundDiv(emp.rate_paise * BigInt(payableHalves), BigInt(divisor) * 2n))
  }

  let additions = 0n, deductions = 0n, advanceWanted = 0n
  for (const a of adjustments) {
    if (a.amount_paise < 0n) throw new Error("Adjustment amounts must be positive")
    if (a.kind === "bonus" || a.kind === "overtime") additions += a.amount_paise
    else if (a.kind === "deduction") deductions += a.amount_paise
    else advanceWanted += a.amount_paise
  }
  const beforeAdvance = gross + additions - deductions
  const available = beforeAdvance > 0n ? beforeAdvance : 0n
  const recovered = advanceWanted <= available ? advanceWanted : available
  const net = roundToRupee(beforeAdvance - recovered)

  return {
    month,
    employed,
    days_in_month: days,
    employed_days: employedDays.length,
    weekly_off_days: offDays,
    unpaid_absence_days: unpaidHalves / 2,
    payable_days: payableHalves / 2,
    divisor,
    gross_paise: gross,
    additions_paise: additions,
    deductions_paise: deductions,
    advance_recovered_paise: recovered,
    advance_carried_paise: advanceWanted - recovered,
    net_paise: net < 0n ? 0n : net,
  }
}

/** Split an advance into N installments (last one absorbs the remainder). */
export function installments(total: bigint, n: number): bigint[] {
  if (n < 1) throw new Error("n must be ≥ 1")
  const each = total / BigInt(n)
  const out = Array.from({ length: n }, () => each)
  out[n - 1] += total - each * BigInt(n)
  return out
}
