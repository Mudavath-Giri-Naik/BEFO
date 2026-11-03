import { describe, expect, it } from "vitest"
import { homeFor, type MyContext } from "@/features/auth/home"

const place = (slug: string) => ({ tenant_id: slug, slug, name: slug, type: "hostel", status: "active" })
const ctx = (p: Partial<MyContext>): MyContext => ({ user_id: "u", is_platform_admin: false, staff: [], memberships: [], ...p })
const staff = (slug: string) => ({ ...place(slug), role: "owner" as const, can_see_money: true })
const member = (slug: string) => ({ ...place(slug), member_id: "m" })

describe("homeFor", () => {
  it("sends owners of one place straight to it", () => expect(homeFor(ctx({ staff: [staff("a")] }))).toBe("/app/a"))
  it("sends owners of several places to the picker", () => expect(homeFor(ctx({ staff: [staff("a"), staff("b")] }))).toBe("/app"))
  it("prefers the owner app when the owner is also a member somewhere", () =>
    expect(homeFor(ctx({ staff: [staff("a"), staff("b")], memberships: [member("b")] }))).toBe("/app"))
  it("sends members to /me", () => expect(homeFor(ctx({ memberships: [member("a")] }))).toBe("/me"))
  it("sends platform admins without places to /admin", () => expect(homeFor(ctx({ is_platform_admin: true }))).toBe("/admin"))
  it("falls back to /me", () => {
    expect(homeFor(ctx({}))).toBe("/me")
    expect(homeFor(null)).toBe("/me")
  })
})
