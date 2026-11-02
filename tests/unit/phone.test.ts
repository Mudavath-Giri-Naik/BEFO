import { describe, expect, it } from "vitest"
import { maskPhone, normalizePhone, waLink } from "@/lib/phone"

describe("phone", () => {
  it("normalises Indian mobiles", () => {
    expect(normalizePhone("9876543210")).toBe("+919876543210")
    expect(normalizePhone("+91 98765 43210")).toBe("+919876543210")
    expect(normalizePhone("09876543210")).toBe("+919876543210")
    expect(normalizePhone("919876543210")).toBe("+919876543210")
    expect(normalizePhone("(+91) 98765-43210")).toBe("+919876543210")
    expect(normalizePhone(9876543210)).toBe("+919876543210")
  })
  it("rejects Excel-damaged and invalid numbers", () => {
    expect(normalizePhone("9.88E+09")).toBeNull()
    expect(normalizePhone("9.87654E+09")).toBeNull()
    expect(normalizePhone(9.88e9 + 0.5)).toBeNull()
    expect(normalizePhone("12345")).toBeNull()
    expect(normalizePhone("5876543210")).toBeNull()
    expect(normalizePhone("98765abc10")).toBeNull()
    expect(normalizePhone("")).toBeNull()
    expect(normalizePhone(null)).toBeNull()
  })
  it("masks and links", () => {
    expect(maskPhone("+919876543210")).toBe("+91 98•••••210")
    expect(waLink("+919876543210", "hi there")).toBe("https://wa.me/919876543210?text=hi%20there")
  })
})
