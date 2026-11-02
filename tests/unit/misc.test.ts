import { describe, expect, it } from "vitest"
import { slugify, validateSlug } from "@/lib/slug"
import { looksSensitive, validateCustom } from "@/lib/custom-fields"

describe("slug", () => {
  it("slugify and validate", () => {
    expect(slugify("Sri Vijaya Food Court & Family Restaurant")).toBe("sri-vijaya-food-court-and-fami")
    expect(validateSlug("sri-vijaya")).toBeNull()
    expect(validateSlug("ab")).not.toBeNull()
    expect(validateSlug("admin")).not.toBeNull()
    expect(validateSlug("Bad_Slug")).not.toBeNull()
    expect(validateSlug("a--b")).not.toBeNull()
  })
})

describe("custom fields", () => {
  it("warns on sensitive labels", () => {
    expect(looksSensitive("Aadhaar number")).toBe(true)
    expect(looksSensitive("PAN")).toBe(true)
    expect(looksSensitive("Blood group")).toBe(true)
    expect(looksSensitive("College name")).toBe(false)
    expect(looksSensitive("Company")).toBe(false)
  })
  it("validates by type", () => {
    const r = validateCustom([
      { key: "college", label: "College", type: "text", required: true },
      { key: "year", label: "Year", type: "select", options: ["1", "2", "3", "4"] },
      { key: "parent", label: "Parent phone", type: "phone" },
      { key: "dob", label: "Joined", type: "date" },
      { key: "veg", label: "Veg only", type: "yesno" },
    ], { college: " MVGR ", year: "4", parent: "98765 43210", dob: "05/11/2026", veg: "Yes" })
    expect(r.ok).toBe(true)
    expect(r.values).toEqual({ college: "MVGR", year: "4", parent: "+919876543210", dob: "2026-11-05", veg: true })
    const bad = validateCustom([{ key: "college", label: "College", type: "text", required: true }, { key: "n", label: "N", type: "number" }], { n: "x" })
    expect(Object.keys(bad.errors)).toEqual(["college", "n"])
  })
})
