import { cache, env, esc, rpc } from "./_lib"

export const config = { runtime: "edge" }

interface Meta { title: string; description: string; image_path: string | null; schema_type: string; name: string; area: string; city: string; lat: number | null; lng: number | null; min_price_paise: number | null }

const setMeta = (html: string, attr: "name" | "property", key: string, value: string) =>
  html.replace(new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`), `$1${esc(value)}$2`)

/**
 * /p/:slug (rewritten here) — the SPA shell with real <title>, description, canonical, OG/Twitter tags and
 * JSON-LD, because WhatsApp and Google don't run JS. 404 for places that aren't public.
 */
export default async function handler(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? ""
  const shellRes = await fetch(new URL("/index.html", req.url))
  // Preview deployments behind Vercel protection can't fetch themselves: hand over to the SPA instead.
  if (!shellRes.ok) return Response.redirect(new URL(`/explore?place=${encodeURIComponent(slug)}`, req.url), 307)
  let html = await shellRes.text()
  const plain = (status = 200) => new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } })
  let meta: Meta | null
  try { meta = await rpc<Meta | null>("public_place_meta", { p_slug: slug }) } catch { return plain() }
  if (!meta) return plain(404)

  const { url: sbUrl, site } = env()
  const origin = site || new URL(req.url).origin
  const url = `${origin}/p/${encodeURIComponent(slug)}`
  const image = meta.image_path ? `${sbUrl}/storage/v1/object/public/place-photos/${meta.image_path}` : `${origin}/icon-512.png`
  const ld = {
    "@context": "https://schema.org", "@type": meta.schema_type, name: meta.name, url, image,
    address: { "@type": "PostalAddress", addressLocality: meta.area || meta.city, addressRegion: "Andhra Pradesh", addressCountry: "IN" },
    ...(meta.lat != null ? { geo: { "@type": "GeoCoordinates", latitude: meta.lat, longitude: meta.lng } } : {}),
    ...(meta.min_price_paise != null ? { priceRange: `From ₹${Math.round(meta.min_price_paise / 100)}/month` } : {}),
  }
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
  html = setMeta(html, "name", "description", meta.description)
  html = setMeta(html, "property", "og:title", meta.title)
  html = setMeta(html, "property", "og:description", meta.description)
  const tags = [
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:url" content="${esc(url)}">`, `<meta property="og:image" content="${esc(image)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
  ].join("")
  html = html.replace("</head>", `${tags}</head>`)
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": cache(120) } })
}
