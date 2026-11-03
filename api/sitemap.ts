import { cache, env, esc, rpc } from "./_lib"

export const config = { runtime: "edge" }

/** /sitemap.xml (rewritten here) from approved listed places and city pages. */
export default async function handler(req: Request) {
  const site = env().site || new URL(req.url).origin
  let rows: { path: string; updated_at: string | null }[] = []
  try { rows = await rpc("public_sitemap") } catch { /* still list the static pages */ }
  const urls = [{ path: "/", updated_at: null }, { path: "/explore", updated_at: null }, ...rows]
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${esc(site + u.path)}</loc>${u.updated_at ? `<lastmod>${u.updated_at.slice(0, 10)}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": cache(3600) } })
}
