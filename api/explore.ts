import { fail, json, rpc } from "./_lib"

export const config = { runtime: "edge" }

/** GET /api/explore?q=&type=&audience=&city=&min=&max=&amenities=&veg=&free=1&lat=&lng=&sort=&cursor= — CDN cached 60 s. */
export default async function handler(req: Request) {
  const u = new URL(req.url).searchParams
  const n = (k: string) => (u.get(k) ? Number(u.get(k)) : null)
  try {
    const rows = await rpc<unknown[]>("search_places", {
      p_q: u.get("q"), p_type: u.get("type"), p_audience: u.get("audience"), p_city: u.get("city"), p_area: null,
      p_min_price: n("min") != null ? n("min")! * 100 : null, p_max_price: n("max") != null ? n("max")! * 100 : null,
      p_amenities: u.get("amenities") ? u.get("amenities")!.split(",") : null, p_veg: u.get("veg"), p_only_available: u.get("free") === "1",
      p_lat: n("lat"), p_lng: n("lng"), p_radius_km: n("radius"), p_sort: u.get("sort") ?? "relevance", p_cursor: n("cursor") ?? 0, p_limit: 24,
    })
    return json(rows, 200, 60)
  } catch (e) { return fail(e) }
}
