import { cached, esc, rpc, type Ctx } from "./_shared"

/** /sitemap.xml from approved listed places and city pages. */
export const onRequestGet = (ctx: Ctx) =>
  cached(ctx, 3600, async () => {
    const rows = await rpc<{ path: string; updated_at: string }[]>(ctx.env, "public_sitemap")
    const urls = [{ path: "/", updated_at: null }, { path: "/explore", updated_at: null }, ...rows]
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${esc(ctx.env.SITE_URL + u.path)}</loc>${u.updated_at ? `<lastmod>${u.updated_at.slice(0, 10)}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`
    return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } })
  })
