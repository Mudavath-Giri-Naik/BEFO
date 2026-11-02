import { cached, json, rpc, type Ctx } from "../_shared"

/** GET /api/explore?q=&type=&audience=&city=&min=&max=&amenities=&veg=&free=1&lat=&lng=&sort=&cursor= — edge cached 60 s. */
export const onRequestGet = (ctx: Ctx) =>
  cached(ctx, 60, async () => {
    const u = new URL(ctx.request.url).searchParams
    const n = (k: string) => (u.get(k) ? Number(u.get(k)) : null)
    const rows = await rpc<unknown[]>(ctx.env, "search_places", {
      p_q: u.get("q"), p_type: u.get("type"), p_audience: u.get("audience"), p_city: u.get("city"), p_area: null,
      p_min_price: n("min") != null ? n("min")! * 100 : null, p_max_price: n("max") != null ? n("max")! * 100 : null,
      p_amenities: u.get("amenities") ? u.get("amenities")!.split(",") : null, p_veg: u.get("veg"), p_only_available: u.get("free") === "1",
      p_lat: n("lat"), p_lng: n("lng"), p_radius_km: n("radius"), p_sort: u.get("sort") ?? "relevance", p_cursor: n("cursor") ?? 0, p_limit: 24,
    })
    return json(rows)
  })
