import { describe, expect, it } from "vitest"
import { computePeriod, deriveStatus, dueOnFrom, reminderStep } from "@/lib/billing"

const monthly = { period_unit: "month" as const, period_count: 1 }

describe("billing periods", () => {
  it("from_payment_date starts on the payment date (mess)", () => {
    expect(computePeriod({ rule: "from_payment_date", plan: monthly, paidOn: "2026-11-05", previousDue: "2026-10-20" }))
      .toEqual({ start: "2026-11-05", end: "2026-12-05" })
  })
  it("from_previous_due continues the cycle (hostel)", () => {
    expect(computePeriod({ rule: "from_previous_due", plan: monthly, paidOn: "2026-11-09", previousDue: "2026-11-01" }))
      .toEqual({ start: "2026-11-01", end: "2026-12-01" })
    expect(computePeriod({ rule: "from_previous_due", plan: monthly, paidOn: "2026-11-09", billingStart: "2026-11-03" }))
      .toEqual({ start: "2026-11-03", end: "2026-12-03" })
    expect(computePeriod({ rule: "from_previous_due", plan: monthly, paidOn: "2026-11-09" }))
      .toEqual({ start: "2026-11-09", end: "2026-12-09" })
  })
  it("31 Jan → 28 Feb clamp, leap year, multi-period", () => {
    expect(computePeriod({ rule: "from_payment_date", plan: monthly, paidOn: "2026-01-31" }).end).toBe("2026-02-28")
    expect(computePeriod({ rule: "from_payment_date", plan: monthly, paidOn: "2028-01-31" }).end).toBe("2028-02-29")
    expect(computePeriod({ rule: "from_payment_date", plan: monthly, paidOn: "2026-01-31", periods: 3 }).end).toBe("2026-04-30")
  })
  it("due date ignores voided and non-subscription payments", () => {
    expect(dueOnFrom([
      { kind: "subscription", period_end: "2026-12-05" },
      { kind: "subscription", period_end: "2027-01-05", voided_at: "2026-11-06T00:00:00Z" },
      { kind: "charge", period_end: "2027-03-01" },
      { kind: "extension", period_end: "2026-12-10" },
    ], null)).toBe("2026-12-10")
    expect(dueOnFrom([], "2026-11-01")).toBe("2026-11-01")
  })
})

describe("status", () => {
  const base = { today: "2026-11-02", hasSubscriptionPayment: true }
  it("valid through the due date, grace 0", () => {
    expect(deriveStatus({ ...base, dueOn: "2026-11-02" }).status).toBe("expiring_soon")
    expect(deriveStatus({ ...base, dueOn: "2026-11-01" }).status).toBe("expired")
    expect(deriveStatus({ ...base, dueOn: "2026-11-01", graceDays: 1 }).status).toBe("expiring_soon")
    expect(deriveStatus({ ...base, dueOn: "2026-11-20" })).toEqual({ status: "active", daysLeft: 18 })
    expect(deriveStatus({ ...base, dueOn: "2026-11-05", expiringSoonDays: 3 }).status).toBe("expiring_soon")
    expect(deriveStatus({ ...base, dueOn: "2026-11-06", expiringSoonDays: 3 }).status).toBe("active")
  })
  it("priority order", () => {
    expect(deriveStatus({ ...base, dueOn: "2026-11-20", removedAt: "x", pausedAt: "y" }).status).toBe("removed")
    expect(deriveStatus({ ...base, dueOn: "2026-11-20", leftOn: "2026-11-01" }).status).toBe("former")
    expect(deriveStatus({ ...base, dueOn: "2026-11-20", leftOn: "2026-11-30" }).status).toBe("active")
    expect(deriveStatus({ ...base, dueOn: "2026-10-01", pausedAt: "y" }).status).toBe("paused")
    expect(deriveStatus({ today: "2026-11-02", dueOn: "2026-11-01", hasSubscriptionPayment: false }).status).toBe("no_payment")
  })
  it("reminder ladder", () => {
    expect(reminderStep("2026-11-02", "2026-11-05")).toBe("before_3")
    expect(reminderStep("2026-11-05", "2026-11-05")).toBe("due_day")
    expect(reminderStep("2026-11-07", "2026-11-05")).toBe("after_2")
    expect(reminderStep("2026-11-06", "2026-11-05")).toBeNull()
  })
})
