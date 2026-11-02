import { describe, expect, it } from "vitest"
import { cashDifference, computePnL, isProbableDuplicate, resolveCategory } from "@/lib/finance"

describe("P&L definitions", () => {
  it("deposits are not income; investments only hit cash profit; drafts ignored", () => {
    const p = computePnL([
      { direction: "in", kind: "member_payment", amount_paise: 75_000_000n, status: "confirmed" },
      { direction: "in", kind: "deposit_in", amount_paise: 5_000_000n, status: "confirmed" },
      { direction: "out", kind: "expense", amount_paise: 30_000_000n, status: "confirmed", category_key: "vegetables" },
      { direction: "in", kind: "expense", amount_paise: 1_000_000n, status: "confirmed", category_key: "vegetables" },
      { direction: "out", kind: "salary", amount_paise: 10_000_000n, status: "confirmed", category_key: "salaries" },
      { direction: "out", kind: "investment", amount_paise: 4_000_000n, status: "confirmed", category_key: "kitchen_equipment" },
      { direction: "out", kind: "expense", amount_paise: 99_000_000n, status: "draft" },
      { direction: "out", kind: "expense", amount_paise: 99_000_000n, status: "void" },
      { direction: "out", kind: "advance", amount_paise: 500_000n, status: "confirmed" },
    ])
    expect(p.income_paise).toBe(75_000_000n)
    expect(p.operating_expense_paise).toBe(39_000_000n)
    expect(p.operating_profit_paise).toBe(36_000_000n)
    expect(p.cash_profit_paise).toBe(32_000_000n)
    expect(p.deposits_held_change_paise).toBe(5_000_000n)
    expect(p.margin_pct).toBe(48)
    expect(p.by_category.vegetables).toBe(29_000_000n)
  })
  it("cash count difference", () => {
    expect(cashDifference(100_000n, 500_000n, 200_000n, 390_000n)).toEqual({ expected_paise: 400_000n, diff_paise: -10_000n })
  })
  it("dedupe order", () => {
    const a = { utr: "123", sha256: "h1", party: "p", amount_paise: 100n, date: "2026-11-01" }
    expect(isProbableDuplicate(a, { ...a, sha256: "h2" })).toBe("utr")
    expect(isProbableDuplicate({ ...a, utr: null }, { ...a, utr: "9" })).toBe("hash")
    expect(isProbableDuplicate({ ...a, utr: null, sha256: null }, { ...a, utr: null, sha256: null, date: "2026-11-04" })).toBe("heuristic")
    expect(isProbableDuplicate({ ...a, utr: null, sha256: null }, { ...a, utr: null, sha256: null, date: "2026-11-05" })).toBeNull()
  })
  it("category resolution order", () => {
    expect(resolveCategory({ chip: "gas", vendorDefault: "veg", ai: "x" }).source).toBe("owner")
    expect(resolveCategory({ vendorDefault: "veg", recurring: "r", ai: "x" }).key).toBe("veg")
    expect(resolveCategory({ recurring: "r", ai: "x" }).key).toBe("r")
    expect(resolveCategory({}).key).toBe("uncategorised")
  })
})
