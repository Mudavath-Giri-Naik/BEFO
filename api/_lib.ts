/**
 * Vercel Edge Function helpers (files starting with "_" are not routes). Env (Vercel → Settings →
 * Environment Variables): SUPABASE_URL + SUPABASE_ANON_KEY (publishable key — never the secret key) and
 * SITE_URL; each falls back to its VITE_ twin so one set of variables is enough. Public data only,
 * through the allow-listed RPCs.
 */
declare const process: { env: Record<string, string | undefined> }

export function env() {
  const e = process.env
  return {
    url: (e.SUPABASE_URL || e.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    key: e.SUPABASE_ANON_KEY || e.VITE_SUPABASE_ANON_KEY || "",
    site: (e.SITE_URL || e.VITE_APP_URL || "").replace(/\/$/, ""),
  }
}

export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { url, key } = env()
  if (!url || !key) throw new Error("supabase_not_configured")
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  })
  if (!r.ok) throw new Error(`${fn}: ${r.status}`)
  return (await r.json()) as T
}

/** Shared by every visitor, so the Vercel CDN may cache it (§4.1). */
export const cache = (ttl: number) => `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=300`

export const json = (data: unknown, status = 200, ttl = 0) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...(ttl && status === 200 ? { "Cache-Control": cache(ttl) } : { "Cache-Control": "no-store" }) },
  })

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

export const fail = (e: unknown) => json({ error: e instanceof Error ? e.message : "error" }, 502)
