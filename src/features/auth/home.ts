export interface MyContext {
  user_id: string
  is_platform_admin: boolean
  staff: { tenant_id: string; slug: string; name: string; type: string; role: "owner" | "manager"; can_see_money: boolean; status: string }[]
  memberships: { tenant_id: string; slug: string; name: string; type: string; member_id: string; status: string }[]
}

/**
 * Where to go after login (§11.7): staff → /app, customer → /me. The spec sends "both" to /me with sections;
 * until the customer app exists (Phase 6) staff go to their place first, so an owner who is also a member
 * somewhere is not stranded on a placeholder.
 */
export function homeFor(c: MyContext | null): string {
  if (!c) return "/me"
  if (c.staff.length === 1) return `/app/${c.staff[0].slug}`
  if (c.staff.length > 1) return "/app"
  if (c.is_platform_admin) return "/admin"
  return "/me"
}
