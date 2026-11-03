import { supabase } from "@/lib/supabase"

/** Platform-admin read models. They return counts and business-level data only — no member or finance detail (§10.11). */
export interface AdminOverview {
  applications_pending: number
  places: number
  places_running: number
  places_suspended: number
  by_type: Record<string, number>
  listings_pending: number
  listings_live: number
  reports_open: number
  users: number
  users_7d: number
  members: number
  join_requests_pending: number
}

export interface AdminApplication {
  id: string
  name: string
  slug: string
  business_type: string
  city: string
  audience: string
  plan_name: string | null
  plan_price_paise: number | null
  note: string | null
  status: "pending" | "approved" | "rejected" | "withdrawn"
  decision_note: string | null
  decided_at: string | null
  created_at: string
  phone: string
  applicant_name: string | null
  applicant_email: string | null
  tenant_slug: string | null
}

export interface AdminPlace {
  id: string
  slug: string
  name: string
  business_type: string
  city: string
  status: "trial" | "active" | "suspended" | "closed"
  created_at: string
  contact_phone: string | null
  owner_name: string | null
  owner_email: string | null
  moderation_status: "draft" | "pending" | "approved" | "rejected" | "suspended" | null
  visibility: "private" | "listed" | null
  verified_level: "none" | "verified" | null
  members: number
  last_activity: string | null
}

export interface AdminReport {
  id: string
  tenant_id: string
  reason: string
  details: string | null
  status: "open" | "dismissed" | "warned" | "suspended"
  created_at: string
}

const ERR: Record<string, string> = {
  forbidden: "Only platform admins can do this.", reason_required: "Add a short reason for the owner.",
  already_decided: "This application was already decided.", slug_taken: "That web address is now taken by another place.",
  not_found: "It no longer exists.",
}

function db() {
  if (!supabase) throw new Error("Supabase is not configured")
  return supabase
}
async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db().rpc(fn, args)
  if (error) throw new Error(ERR[error.message] ?? error.message)
  return data as T
}

export const adminApi = {
  overview: () => rpc<AdminOverview>("admin_overview"),
  applications: (status?: string) => rpc<AdminApplication[]>("admin_applications", { p_status: status ?? null }),
  places: () => rpc<AdminPlace[]>("admin_places"),
  reports: async (): Promise<AdminReport[]> => {
    const { data, error } = await db().from("place_reports").select("id, tenant_id, reason, details, status, created_at")
      .order("created_at", { ascending: false }).limit(200)
    if (error) throw new Error(error.message)
    return data as AdminReport[]
  },
  decideApplication: (id: string, action: "approve" | "reject", note?: string) =>
    rpc<{ status: string; slug: string }>("admin_decide_application", { p_id: id, p_action: action, p_note: note ?? null }),
  moderate: (tenant: string, action: "approve" | "reject" | "suspend" | "verify" | "unverify", note?: string) =>
    rpc<void>("moderate_listing", { p_tenant: tenant, p_action: action, p_note: note ?? null }),
  setStatus: (tenant: string, status: AdminPlace["status"], note?: string) =>
    rpc<void>("admin_set_tenant_status", { p_tenant: tenant, p_status: status, p_note: note ?? null }),
  handleReport: (id: string, action: "dismissed" | "warned" | "suspended") => rpc<void>("handle_report", { p_report: id, p_action: action }),
}
