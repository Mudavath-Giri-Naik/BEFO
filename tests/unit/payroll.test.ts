import { describe, expect, it } from "vitest"
import { computePayout, installments, type EmployeePayInput } from "@/lib/payroll"

const base: EmployeePayInput = {
  pay_type: "monthly", rate_paise: 1_200_000n, proration_rule: "calendar_days",
  joined_on: "2025-01-01", weekly_off: [], weekly_off_paid: true,
}

describe("computePayout", () => {
  it("spec example: ₹12,000, joined 10 Nov, 30-day month → ₹8,400", () => {
    const r = computePayout({ ...base, joined_on: "2026-11-10" }, "2026-11")
    expect(r.payable_days).toBe(21)
    expect(r.net_paise).toBe(840_000n)
  })
  it("full month pays the full rate for every rule", () => {
    for (const rule of ["calendar_days", "fixed_30", "working_days"] as const) {
      expect(computePayout({ ...base, proration_rule: rule }, "2026-12").net_paise).toBe(1_200_000n)
      expect(computePayout({ ...base, proration_rule: rule, weekly_off: [0], weekly_off_paid: rule !== "calendar_days" }, "2026-02").net_paise)
        .toBe(rule === "calendar_days" ? 1_028_600n /* 24/28 with 4 unpaid Sundays */ : 1_200_000n)
    }
  })
  it("leaving mid-month", () => {
    const r = computePayout({ ...base, left_on: "2026-11-15" }, "2026-11")
    expect(r.payable_days).toBe(15)
    expect(r.net_paise).toBe(600_000n)
  })
  it("absences: full and half, paid leave free, weekly off ignored", () => {
    const r = computePayout({ ...base, weekly_off: [0] }, "2026-11", [
      { date: "2026-11-03", kind: "full" },
      { date: "2026-11-04", kind: "half" },
      { date: "2026-11-05", kind: "paid_leave" },
      { date: "2026-11-01", kind: "full" }, // Sunday off → ignored
    ])
    expect(r.unpaid_absence_days).toBe(1.5)
    expect(r.payable_days).toBe(28.5)
    expect(r.net_paise).toBe(1_140_000n) // 12000 × 28.5 / 30
  })
  it("fixed_30 in a 31-day month with a mid-month join", () => {
    const r = computePayout({ ...base, proration_rule: "fixed_30", joined_on: "2026-12-02" }, "2026-12")
    expect(r.payable_days).toBe(30)
    expect(r.divisor).toBe(30)
    expect(r.net_paise).toBe(1_200_000n)
  })
  it("working_days divisor excludes weekly offs", () => {
    // Nov 2026: 30 days, 5 Sundays → 25 working days. Joined 16 Nov: 15 days incl. 2 Sundays → 13 working days.
    const r = computePayout({ ...base, proration_rule: "working_days", weekly_off: [0], joined_on: "2026-11-16" }, "2026-11")
    expect(r.divisor).toBe(25)
    expect(r.payable_days).toBe(13)
    expect(r.net_paise).toBe(624_000n)
  })
  it("daily wage", () => {
    const r = computePayout({ ...base, pay_type: "daily", rate_paise: 50_000n, weekly_off: [0], weekly_off_paid: false }, "2026-11", [{ date: "2026-11-10", kind: "half" }])
    expect(r.payable_days).toBe(24.5)
    expect(r.net_paise).toBe(1_225_000n)
  })
  it("adjustments and advance recovery, capped at pay", () => {
    const r = computePayout({ ...base, joined_on: "2026-11-25" }, "2026-11", [], [
      { kind: "bonus", amount_paise: 50_000n },
      { kind: "advance_recovery", amount_paise: 500_000n },
    ])
    expect(r.gross_paise).toBe(240_000n) // 6 days
    expect(r.advance_recovered_paise).toBe(290_000n)
    expect(r.advance_carried_paise).toBe(210_000n)
    expect(r.net_paise).toBe(0n)
  })
  it("rounds net to whole rupees half up", () => {
    const r = computePayout({ ...base, rate_paise: 1_000_000n, joined_on: "2026-12-11" }, "2026-12") // 21/31 × 10000 = 6774.19
    expect(r.net_paise).toBe(677_400n)
  })
  it("not employed that month", () => {
    expect(computePayout({ ...base, joined_on: "2027-01-05" }, "2026-12").net_paise).toBe(0n)
  })
  it("installments", () => {
    expect(installments(1_000_00n, 3)).toEqual([33_333n, 33_333n, 33_334n])
  })
})
