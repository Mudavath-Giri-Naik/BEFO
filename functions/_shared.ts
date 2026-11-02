/**
 * Cloudflare Pages Functions shared helpers. Env (Pages → Settings → Variables): SUPABASE_URL, SUPABASE_ANON_KEY
 * (publishable key — never the secret key), SITE_URL. Public data only, through the allow-listed RPCs.
 */
export interface Env { SUPABASE_URL: string; SUPABASE_ANON_KEY: string; SITE_URL: string; ASSETS: { fetch: (r: Request | string) => Promise<Response> } }
export interface Ctx { request: Request; env: Env; params: Record<string, string | string[]>; waitUntil: (p: Promise<unknown>) => void }

export async function rpc<T>(env: Env, fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  })
  if (!r.ok) throw new Error(`${fn}: ${r.status}`)
  return (await r.json()) as T
}

/** Edge cache wrapper: public responses are shared by all visitors (§4.1). */
export async function cached(ctx: Ctx, ttl: number, make: () => Promise<Response>): Promise<Response> {
  const cache = (caches as unknown as { default: Cache }).default
  const key = new Request(new URL(ctx.request.url).toString(), { method: "GET" })
  const hit = await cache.match(key)
  if (hit) return hit
  const res = await make()
  if (res.ok) {
    const out = new Response(res.body, res)
    out.headers.set("Cache-Control", `public, s-maxage=${ttl}, stale-while-revalidate=300`)
    ctx.waitUntil(cache.put(key, out.clone()))
    return out
  }
  return res
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8" } })

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
