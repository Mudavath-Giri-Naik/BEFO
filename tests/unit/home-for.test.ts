import { describe, expect, it } from "vitest"
import { homeFor, type MyContext } from "@/features/auth/home"

const place = (slug: string) => ({ tenant_id: slug, slug, name: slug, type: "hostel", status: "active" })
const ctx = (p: Partial<MyContext>): MyContext => ({ user_id: "u", is_platform_admin: false, staff: [], memberships: [], applications: [], ...p })
const staff = (slug: string) => ({ ...place(slug), role: "owner" as const, can_see_money: true })
const member = (slug: string) => ({ ...place(slug), member_id: "m" })
const application = { id: "a", name: "New", slug: "new", type: "mess", status: "pending" as const, decision_note: null, created_at: "2026-11-03" }

describe("homeFor", () => {
  it("sends admins to the admin dashboard, even if they run a place", () =>
    expect(homeFor(ctx({ is_platform_admin: true, staff: [staff("a")] }))).toBe("/admin"))
  it("sends owners of one place straight to it", () => expect(homeFor(ctx({ staff: [staff("a")] }))).toBe("/app/a"))
  it("sends owners of several places to the picker", () => expect(homeFor(ctx({ staff: [staff("a"), staff("b")] }))).toBe("/app"))
  it("sends owners who are also members to the combined home", () =>
    expect(homeFor(ctx({ staff: [staff("a")], memberships: [member("b")] }))).toBe("/me"))
  it("sends owners with a pending application to the combined home", () =>
    expect(homeFor(ctx({ staff: [staff("a")], applications: [application] }))).toBe("/me"))
  it("sends students to /me", () => expect(homeFor(ctx({ memberships: [member("a")] }))).toBe("/me"))
  it("sends applicants and new users to /me", () => {
    expect(homeFor(ctx({ applications: [application] }))).toBe("/me")
    expect(homeFor(ctx({}))).toBe("/me")
    expect(homeFor(null)).toBe("/me")
  })
})
