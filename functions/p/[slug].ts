import { esc, rpc, type Ctx } from "../_shared"

interface Meta { title: string; description: string; image_path: string | null; schema_type: string; name: string; area: string; city: string; lat: number | null; lng: number | null; min_price_paise: number | null }

/**
 * /p/:slug — serve the SPA shell with real <title>, description, canonical, OG/Twitter tags and JSON-LD
 * injected at the edge (WhatsApp/Google don't run JS). 404 for places that aren't public.
 */
export async function onRequestGet(ctx: Ctx) {
  const slug = String(ctx.params.slug)
  const shell = await ctx.env.ASSETS.fetch(new URL("/index.html", ctx.request.url).toString())
  let meta: Meta | null = null
  try { meta = await rpc<Meta | null>(ctx.env, "public_place_meta", { p_slug: slug }) } catch { return shell }
  if (!meta) return new Response(await shell.text(), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } })
  const url = `${ctx.env.SITE_URL}/p/${slug}`
  const image = meta.image_path ? `${ctx.env.SUPABASE_URL}/storage/v1/object/public/place-photos/${meta.image_path}` : `${ctx.env.SITE_URL}/icon-512.png`
  const ld = {
    "@context": "https://schema.org", "@type": meta.schema_type, name: meta.name, url, image,
    address: { "@type": "PostalAddress", addressLocality: meta.area || meta.city, addressRegion: "Andhra Pradesh", addressCountry: "IN" },
    ...(meta.lat != null ? { geo: { "@type": "GeoCoordinates", latitude: meta.lat, longitude: meta.lng } } : {}),
    ...(meta.min_price_paise != null ? { priceRange: `From ₹${Math.round(meta.min_price_paise / 100)}/month` } : {}),
  }
  const tags = [
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:url" content="${esc(url)}">`, `<meta property="og:image" content="${esc(image)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
  ].join("")
  return new HTMLRewriter()
    .on("title", { element: (e) => e.setInnerContent(meta!.title) })
    .on('meta[name="description"]', { element: (e) => e.setAttribute("content", meta!.description) })
    .on('meta[property="og:title"]', { element: (e) => e.setAttribute("content", meta!.title) })
    .on('meta[property="og:description"]', { element: (e) => e.setAttribute("content", meta!.description) })
    .on("head", { element: (e) => e.append(tags, { html: true }) })
    .transform(new Response(shell.body, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } }))
}
