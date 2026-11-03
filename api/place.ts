import { fail, json, rpc } from "./_lib"

export const config = { runtime: "edge" }

/** GET /api/place/:slug (rewritten to ?slug=) — public detail, CDN cached 120 s. 404 when not public. */
export default async function handler(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? ""
  try {
    const d = await rpc<unknown>("public_place_detail", { p_slug: slug })
    return d ? json(d, 200, 120) : json({ error: "not_found" }, 404)
  } catch (e) { return fail(e) }
}
