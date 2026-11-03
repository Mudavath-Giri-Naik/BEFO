export interface MyContext {
  user_id: string
  is_platform_admin: boolean
  staff: { tenant_id: string; slug: string; name: string; type: string; role: "owner" | "manager"; can_see_money: boolean; status: string }[]
  memberships: { tenant_id: string; slug: string; name: string; type: string; member_id: string; status: string }[]
  /** The person's own pending or rejected place applications (approved ones show up as staff). */
  applications?: { id: string; name: string; slug: string; type: string; status: "pending" | "rejected"; decision_note: string | null; created_at: string }[]
}

/**
 * Where to go after login (§11.7): admins → /admin, people who only run places → their owner app,
 * everyone else (members, owners who are also members, applicants, new users) → /me, which shows all of it.
 */
export function homeFor(c: MyContext | null): string {
  if (!c) return "/me"
  if (c.is_platform_admin) return "/admin"
  const onlyStaff = c.staff.length > 0 && c.memberships.length === 0 && !(c.applications?.length)
  if (onlyStaff) return c.staff.length === 1 ? `/app/${c.staff[0].slug}` : "/app"
  return "/me"
}
