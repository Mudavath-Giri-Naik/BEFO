import { describe, expect, it } from "vitest"
import { formatRupees, formatRupeesCompact, parseIndianAmount, roundDiv, roundToRupee } from "@/lib/money"

describe("money", () => {
  it("formats rupees with Indian grouping and hides .00", () => {
    expect(formatRupees(300000)).toBe("₹3,000")
    expect(formatRupees(12345678900)).toBe("₹12,34,56,789")
    expect(formatRupees(230050)).toBe("₹2,300.50")
    expect(formatRupees(5)).toBe("₹0.05")
    expect(formatRupees(-150000)).toBe("−₹1,500")
    expect(formatRupees(150000, { symbol: false })).toBe("1,500")
  })
  it("compact format", () => {
    expect(formatRupeesCompact(12_000_000n)).toBe("₹1.2L")
    expect(formatRupeesCompact(3_40_00_000_00n)).toBe("₹3.4Cr")
    expect(formatRupeesCompact(450000)).toBe("₹4,500")
  })
  it("rounds half up", () => {
    expect(roundDiv(5n, 2n)).toBe(3n)
    expect(roundDiv(4n, 3n)).toBe(1n)
    expect(roundDiv(-5n, 2n)).toBe(-3n)
    expect(roundToRupee(840050n)).toBe(840100n)
    expect(roundToRupee(840049n)).toBe(840000n)
  })
  it("parses Indian amounts", () => {
    expect(parseIndianAmount("₹2,300")).toBe(230000n)
    expect(parseIndianAmount("Rs. 2300.50")).toBe(230050n)
    expect(parseIndianAmount("INR 1,23,456")).toBe(12345600n)
    expect(parseIndianAmount("2.5 lakh")).toBe(25000000n)
    expect(parseIndianAmount("1 crore")).toBe(1000000000n)
    expect(parseIndianAmount("1100/-")).toBe(110000n)
    expect(parseIndianAmount("0.005")).toBe(1n)
    expect(parseIndianAmount("abc")).toBeNull()
    expect(parseIndianAmount("")).toBeNull()
    expect(parseIndianAmount(-4)).toBeNull()
    expect(parseIndianAmount(19.99)).toBe(1999n)
  })
})
