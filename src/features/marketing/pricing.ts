/**
 * Public price list for the home page. One place to change numbers, limits and the pilot offer.
 * Money is paise (bigint) like everywhere else; display with formatRupees.
 */
export type Billing = "monthly" | "yearly"

export interface Tier {
  id: "starter" | "growth" | "pro"
  name: string
  blurb: string
  monthlyPaise: bigint
  members: number
  places: number
  staffLogins: number
  popular?: boolean
  features: string[]
}

/** Yearly billing = this many months' price for 12 months (two months free). */
export const YEARLY_MONTHS_CHARGED = 10n

export const PILOT = {
  freeDays: 90,
  region: "Vizianagaram & Visakhapatnam",
  note: "Every plan is free for the first 90 days during the pilot. No card needed.",
}

export const TIERS: Tier[] = [
  {
    id: "starter", name: "Starter", blurb: "For a small mess or PG getting off the notebook.",
    monthlyPaise: 49_900n, members: 60, places: 1, staffLogins: 1,
    features: ["Members, plans and due dates", "UPI “I paid” with one-tap confirm", "WhatsApp reminders, written for you", "Join requests from your QR poster", "Public page with live seats & menu"],
  },
  {
    id: "growth", name: "Growth", blurb: "For a busy place that wants to know its real profit.", popular: true,
    monthlyPaise: 99_900n, members: 200, places: 1, staffLogins: 3,
    features: ["Everything in Starter", "Expenses from a bill photo", "Staff, absences and salaries", "Profit & loss every month", "Weekly 10-minute close", "Manager logins with money hidden"],
  },
  {
    id: "pro", name: "Pro", blurb: "For owners with more than one place or a CA to keep happy.",
    monthlyPaise: 199_900n, members: 500, places: 3, staffLogins: 10,
    features: ["Everything in Growth", "Up to 3 places in one login", "Bank statement matching", "CA pack: P&L, ledger and proofs", "Documents vault with expiry reminders", "Priority WhatsApp support"],
  },
]

/** Features that are still rolling out during the pilot; the page tags them "Soon" instead of promising them as live. */
export const SOON = new Set([
  "Expenses from a bill photo", "Staff, absences and salaries", "Profit & loss every month", "Weekly 10-minute close",
  "Bank statement matching", "CA pack: P&L, ledger and proofs", "Documents vault with expiry reminders",
])

/** Price shown per month for the chosen billing (yearly is spread over 12 months, rounded to the rupee). */
export function perMonthPaise(t: Tier, billing: Billing): bigint {
  if (billing === "monthly") return t.monthlyPaise
  const year = yearlyTotalPaise(t)
  return ((year / 12n + 50n) / 100n) * 100n
}

export function yearlyTotalPaise(t: Tier): bigint {
  return t.monthlyPaise * YEARLY_MONTHS_CHARGED
}

/** What yearly billing saves compared with paying monthly for 12 months. */
export function yearlySavingPaise(t: Tier): bigint {
  return t.monthlyPaise * 12n - yearlyTotalPaise(t)
}
