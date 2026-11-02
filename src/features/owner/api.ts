/**
 * Owner app data layer. One interface, two implementations:
 *  - supabaseOwnerApi: real data (RLS-filtered selects + audited RPCs)
 *  - demoOwnerApi: client-side fixtures for /demo (read-only, §9.6)
 */
import { addDays, tenantToday } from "@/lib/dates"
import { supabase } from "@/lib/supabase"

export type SubStatus = "removed" | "former" | "paused" | "no_payment" | "expired" | "expiring_soon" | "active"

export interface OwnerTenant { id: string; slug: string; name: string; type: "mess" | "hostel" | "tiffin" | "other"; role: "owner" | "manager"; can_see_money: boolean }
export interface TodaySummary {
  today: string; collected_month_paise: number; members_active: number; members_total: number; expiring_soon: number; overdue: number
  pending_paise: number; claims_waiting: number; requests_waiting: number; beds_total: number | null; beds_free: number | null
  availability_updated_at: string | null; listing: string; visibility: string; can_see_money: boolean; expense_month_paise: number | null
}
export interface MemberRow {
  member_id: string; name: string; phone: string; code: string; plan_id: string | null; due_on: string | null; days_left: number | null
  sub_status: SubStatus; last_paid_on: string | null; room_label: string | null; open_claim: boolean; deposit_held_paise: number; custom: Record<string, unknown>
}
export interface Plan { id: string; name: string; price_paise: number; period_unit: string; period_count: number; due_rule: string; is_default: boolean }
export interface JoinRequest {
  id: string; name: string; phone: string; message: string | null; move_in_date: string | null; created_at: string
  preferred_room_type_id: string | null; preferred_plan_id: string | null; room_type_name?: string | null
}
export interface Claim {
  id: string; member_id: string; member_name: string; amount_paise: number; method: string; reference: string | null
  paid_at_claimed: string; created_at: string; status: string; checks: Record<string, boolean | null>
}
export interface RoomOption { id: string; label: string; free: number; room_type_id: string | null }

export interface OwnerApi {
  readOnly: boolean
  places(): Promise<OwnerTenant[]>
  today(t: OwnerTenant): Promise<TodaySummary>
  members(t: OwnerTenant): Promise<MemberRow[]>
  plans(t: OwnerTenant): Promise<Plan[]>
  requests(t: OwnerTenant): Promise<JoinRequest[]>
  claims(t: OwnerTenant): Promise<Claim[]>
  rooms(t: OwnerTenant): Promise<RoomOption[]>
  markPaid(memberId: string, amountPaise: number, paidOn: string, method: string): Promise<void>
  decideRequest(id: string, decision: "approve" | "reject" | "waitlist", opts?: { note?: string; planId?: string; roomId?: string }): Promise<void>
  decideClaim(id: string, decision: "confirm" | "reject" | "needs_info", note?: string): Promise<void>
  addMember(t: OwnerTenant, name: string, phone: string, planId?: string): Promise<void>
}

export class ReadOnlyError extends Error {
  constructor() { super("This is demo data. Nothing is saved.") }
}

const ERR: Record<string, string> = {
  forbidden: "You don't have permission for this.", reason_required: "Add a short reason.", already_decided: "Someone already handled this.",
  phone_exists: "Someone with this number is already on the list.", invalid_phone: "Enter a 10-digit mobile number.", no_plan: "Choose a plan for this person first.",
  room_full: "That room has no free bed.", member_cap_reached: "This place has reached its member limit.", future_date: "The payment date cannot be in the future.",
}
function db() {
  if (!supabase) throw new Error("Supabase is not configured")
  return supabase
}
async function rpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await db().rpc(fn, args)
  if (error) throw new Error(ERR[error.message] ?? error.message)
  return data
}
async function sel<T>(q: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data as T
}

export const supabaseOwnerApi: OwnerApi = {
  readOnly: false,
  async places() {
    const ctx = (await rpc("my_context", {})) as { staff: { tenant_id: string; slug: string; name: string; type: OwnerTenant["type"]; role: OwnerTenant["role"]; can_see_money: boolean }[] }
    return ctx.staff.map((s) => ({ id: s.tenant_id, slug: s.slug, name: s.name, type: s.type, role: s.role, can_see_money: s.can_see_money }))
  },
  today: async (t) => (await rpc("owner_today", { p_tenant: t.id })) as TodaySummary,
  members: (t) => sel(db().from("member_overview").select("member_id,name,phone,code,plan_id,due_on,days_left,sub_status,last_paid_on,room_label,open_claim,deposit_held_paise,custom")
    .eq("tenant_id", t.id).is("removed_at", null).order("name").limit(1000)) as Promise<MemberRow[]>,
  plans: (t) => sel(db().from("plans").select("id,name,price_paise,period_unit,period_count,due_rule,is_default").eq("tenant_id", t.id).is("archived_at", null).order("sort")) as Promise<Plan[]>,
  async requests(t) {
    const rows = await sel(db().from("join_requests").select("id,name,phone,message,move_in_date,created_at,preferred_room_type_id,preferred_plan_id,room_types(name)")
      .eq("tenant_id", t.id).eq("status", "pending").order("created_at"))
    return (rows as unknown as (JoinRequest & { room_types: { name: string } | null })[]).map((r) => ({ ...r, room_type_name: r.room_types?.name ?? null }))
  },
  async claims(t) {
    const rows = await sel(db().from("payment_claims").select("id,member_id,amount_paise,method,reference,paid_at_claimed,created_at,status,checks,members(name)")
      .eq("tenant_id", t.id).in("status", ["submitted", "needs_info"]).order("created_at"))
    return (rows as unknown as (Claim & { members: { name: string } })[]).map((r) => ({ ...r, member_name: r.members?.name ?? "" }))
  },
  async rooms(t) {
    const rooms = await sel(db().from("rooms").select("id,label,capacity,blocked_beds,room_type_id").eq("tenant_id", t.id).eq("active", true).order("label")) as { id: string; label: string; capacity: number; blocked_beds: number; room_type_id: string | null }[]
    const beds = await sel(db().from("bed_assignments").select("room_id").eq("tenant_id", t.id).is("to_date", null)) as { room_id: string }[]
    return rooms.map((r) => ({ id: r.id, label: r.label, room_type_id: r.room_type_id, free: r.capacity - r.blocked_beds - beds.filter((b) => b.room_id === r.id).length }))
  },
  markPaid: async (m, a, d, method) => { await rpc("mark_paid", { p_member: m, p_amount_paise: a, p_paid_on: d, p_method: method }) },
  decideRequest: async (id, decision, o = {}) => {
    await rpc("decide_join_request", { p_request: id, p_decision: decision, p_note: o.note ?? null, p_plan_id: o.planId ?? null, p_room_id: o.roomId ?? null })
  },
  decideClaim: async (id, decision, note) => { await rpc("decide_payment_claim", { p_claim: id, p_decision: decision, p_note: note ?? null }) },
  addMember: async (t, name, phone, planId) => { await rpc("add_member", { p_tenant: t.id, p_name: name, p_phone: phone, p_plan_id: planId ?? null }) },
}

// ───────────────────────── demo fixtures ─────────────────────────

const today = tenantToday()
const NAMES = ["Anil Varma", "Bhavani Shankar", "Chaitanya Reddy", "Deepika Rao", "Eswar Naidu", "Farhan Shaik", "Gayatri Devi", "Harsha Vardhan",
  "Indu Priya", "Jagadeesh K", "Kavya Sri", "Lokesh Babu", "Manasa P", "Naveen Kumar", "Pavani L", "Ravi Teja"]
const DEMO_PLACES: (OwnerTenant & { price: number; rooms?: string[] })[] = [
  { id: "demo-mess", slug: "demo-mess", name: "Annapurna Mess", type: "mess", role: "owner", can_see_money: true, price: 300000 },
  { id: "demo-boys", slug: "demo-boys", name: "Sai Krishna Boys Hostel", type: "hostel", role: "owner", can_see_money: true, price: 650000, rooms: ["G1", "G2", "F1", "F2"] },
  { id: "demo-girls", slug: "demo-girls", name: "Sri Lakshmi Ladies Hostel", type: "hostel", role: "owner", can_see_money: true, price: 800000, rooms: ["201", "202", "203"] },
]
function demoMembers(t: OwnerTenant): MemberRow[] {
  const p = DEMO_PLACES.find((x) => x.id === t.id)!
  const names = t.id === "demo-girls" ? NAMES.filter((_, i) => i % 2 === 1) : NAMES
  return names.slice(0, t.id === "demo-mess" ? 16 : 9).map((name, i) => {
    const offset = [12, 2, -3, 20, 0, -9, 25, 5, 1, 17, -1, 28, 9, 3, 14, 22][i]
    const due = addDays(today, offset)
    const status: SubStatus = offset < 0 ? "expired" : offset <= 3 ? "expiring_soon" : "active"
    return {
      member_id: `${t.id}-m${i}`, name, phone: `+91900000${String(1000 + i).slice(-4)}`, code: name.slice(0, 2).toUpperCase() + (10 + i),
      plan_id: `${t.id}-plan`, due_on: due, days_left: offset, sub_status: status, last_paid_on: addDays(due, -30),
      room_label: p.rooms ? p.rooms[i % p.rooms.length] : null, open_claim: i === 2 || i === 5, deposit_held_paise: p.rooms ? p.price : 0, custom: {},
    }
  })
}
const sleep = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 150))
const ro = async () => { throw new ReadOnlyError() }

export const demoOwnerApi: OwnerApi = {
  readOnly: true,
  places: () => sleep(DEMO_PLACES.map(({ price: _p, rooms: _r, ...t }) => t)),
  async today(t) {
    const ms = demoMembers(t)
    const p = DEMO_PLACES.find((x) => x.id === t.id)!
    return sleep({
      today, collected_month_paise: p.price * Math.round(ms.length * 0.6), members_active: ms.filter((m) => m.sub_status !== "expired").length,
      members_total: ms.length, expiring_soon: ms.filter((m) => m.sub_status === "expiring_soon").length, overdue: ms.filter((m) => m.sub_status === "expired").length,
      pending_paise: p.price * ms.filter((m) => m.sub_status === "expired").length, claims_waiting: 2, requests_waiting: t.type === "hostel" ? 2 : 1,
      beds_total: p.rooms ? 12 : 300, beds_free: p.rooms ? 3 : 284, availability_updated_at: new Date(Date.now() - 3 * 3_600_000).toISOString(),
      listing: "approved", visibility: "listed", can_see_money: true, expense_month_paise: Math.round(p.price * ms.length * 0.38),
    })
  },
  members: (t) => sleep(demoMembers(t)),
  plans: (t) => sleep([{ id: `${t.id}-plan`, name: t.type === "hostel" ? "Monthly rent" : "Monthly mess (3 meals)", price_paise: DEMO_PLACES.find((x) => x.id === t.id)!.price,
    period_unit: "month", period_count: 1, due_rule: t.type === "hostel" ? "from_previous_due" : "from_payment_date", is_default: true }]),
  requests: (t) => sleep([
    { id: "r1", name: "Sandeep M", phone: "+919000005501", message: "Joining MVGR this semester. Can I visit on Saturday?", move_in_date: addDays(today, 6), created_at: new Date(Date.now() - 5 * 3_600_000).toISOString(), preferred_room_type_id: null, preferred_plan_id: null, room_type_name: t.type === "hostel" ? "3-sharing" : null },
    ...(t.type === "hostel" ? [{ id: "r2", name: "Vamsi Krishna", phone: "+919000005502", message: null, move_in_date: addDays(today, 15), created_at: new Date(Date.now() - 26 * 3_600_000).toISOString(), preferred_room_type_id: null, preferred_plan_id: null, room_type_name: "2-sharing" }] : []),
  ]),
  claims: (t) => {
    const ms = demoMembers(t)
    const price = DEMO_PLACES.find((x) => x.id === t.id)!.price
    return sleep([
      { id: "c1", member_id: ms[2].member_id, member_name: ms[2].name, amount_paise: price, method: "upi", reference: "430918273645", paid_at_claimed: new Date(Date.now() - 2 * 3_600_000).toISOString(), created_at: new Date().toISOString(), status: "submitted", checks: { amount_match: true, date_ok: true, duplicate_utr: false, duplicate_image: false } },
      { id: "c2", member_id: ms[5].member_id, member_name: ms[5].name, amount_paise: Math.round(price / 2), method: "cash", reference: null, paid_at_claimed: new Date(Date.now() - 30 * 3_600_000).toISOString(), created_at: new Date().toISOString(), status: "submitted", checks: { amount_match: false, date_ok: true, duplicate_utr: false, duplicate_image: false } },
    ])
  },
  rooms: (t) => sleep((DEMO_PLACES.find((x) => x.id === t.id)!.rooms ?? []).map((label, i) => ({ id: `${t.id}-room-${label}`, label, free: i % 2, room_type_id: null }))),
  markPaid: ro, decideRequest: ro, decideClaim: ro, addMember: ro,
}
