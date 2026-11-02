import { describe, expect, it } from "vitest"
import { addDays, addMonths, addPeriod, diffDays, excelSerialToISO, monthBounds, parseIndianDate, tenantToday, weekday } from "@/lib/dates"

describe("dates", () => {
  it("month-end clamp like Postgres date + interval", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28")
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29") // leap year
    expect(addMonths("2026-03-31", 1)).toBe("2026-04-30")
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15")
    expect(addMonths("2026-11-30", -1)).toBe("2026-10-30")
    expect(addPeriod("2026-02-28", "month", 1)).toBe("2026-03-28") // Postgres drifts after a clamp
    expect(addPeriod("2026-11-02", "week", 2)).toBe("2026-11-16")
    expect(addPeriod("2026-12-31", "day", 1)).toBe("2027-01-01")
  })
  it("IST today across UTC midnight", () => {
    // 2026-11-02 19:00 UTC = 2026-11-03 00:30 IST
    expect(tenantToday(new Date("2026-11-02T19:00:00Z"))).toBe("2026-11-03")
    expect(tenantToday(new Date("2026-11-02T18:29:00Z"))).toBe("2026-11-02")
  })
  it("diff and weekday", () => {
    expect(diffDays("2026-11-01", "2026-12-01")).toBe(30)
    expect(diffDays("2026-12-01", "2026-11-01")).toBe(-30)
    expect(weekday("2026-11-01")).toBe(0) // Sunday
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29")
    expect(monthBounds("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28", days: 28 })
  })
  it("parses Indian dates day-first only", () => {
    expect(parseIndianDate("05/11/2026")).toBe("2026-11-05")
    expect(parseIndianDate("5-1-26")).toBe("2026-01-05")
    expect(parseIndianDate("31/02/2026")).toBeNull()
    expect(parseIndianDate("13/13/2026")).toBeNull()
    expect(parseIndianDate("2026-11-05")).toBe("2026-11-05")
    expect(parseIndianDate("garbage")).toBeNull()
  })
  it("Excel serial dates", () => {
    expect(excelSerialToISO(46331)).toBe("2026-11-05")
    expect(parseIndianDate(45658)).toBe("2025-01-01")
    expect(parseIndianDate("46331")).toBe("2026-11-05")
  })
})
