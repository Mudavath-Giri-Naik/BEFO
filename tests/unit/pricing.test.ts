import { describe, expect, it } from "vitest"
import { perMonthPaise, TIERS, yearlySavingPaise, yearlyTotalPaise, type Tier } from "@/features/marketing/pricing"

const tier = (monthlyPaise: bigint): Tier => ({ id: "starter", name: "T", blurb: "", monthlyPaise, members: 1, places: 1, staffLogins: 1, features: [] })

describe("pricing", () => {
  it("yearly is ten months for twelve", () => {
    expect(yearlyTotalPaise(tier(99_900n))).toBe(999_000n)
    expect(yearlySavingPaise(tier(99_900n))).toBe(199_800n)
  })
  it("monthly shows the plain price", () => expect(perMonthPaise(tier(49_900n), "monthly")).toBe(49_900n))
  it("yearly per-month is rounded to the rupee", () => {
    expect(perMonthPaise(tier(49_900n), "yearly")).toBe(41_600n) // 4,99,000 / 12 = 41,583.33 → ₹416
    expect(perMonthPaise(tier(99_900n), "yearly")).toBe(83_300n) // 83,250 → ₹833 (half rounds up)
    expect(perMonthPaise(tier(199_900n), "yearly")).toBe(166_600n) // 1,66,583.33 → ₹1,666
  })
  it("tiers are ordered by price and limits", () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].monthlyPaise > TIERS[i - 1].monthlyPaise).toBe(true)
      expect(TIERS[i].members > TIERS[i - 1].members).toBe(true)
    }
    expect(TIERS.filter((t) => t.popular)).toHaveLength(1)
  })
})
