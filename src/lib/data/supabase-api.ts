import { supabase } from "@/lib/supabase"
import type { CityCount, MenuDay, PlaceCard, PlaceDetail, PublicApi, PublicStats, SearchParams, SearchResult, Suggestion } from "./types"

/**
 * Public API over Supabase RPCs. In production the browser calls the Cloudflare Pages Functions
 * under /api/* (edge-cached, §4.1) — those call these same RPCs. Locally we call Supabase directly.
 */
function db() {
  if (!supabase) throw new Error("Supabase is not configured")
  return supabase
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

export const supabaseApi: PublicApi = {
  async search(p: SearchParams): Promise<SearchResult> {
    const rows = await rpc<(PlaceCard & { next_cursor: number | null })[]>("search_places", {
      p_q: p.q ?? null, p_type: p.type ?? null, p_audience: p.audience ?? null, p_city: p.city ?? null, p_area: p.area ?? null,
      p_min_price: p.minPrice ?? null, p_max_price: p.maxPrice ?? null, p_amenities: p.amenities?.length ? p.amenities : null,
      p_veg: p.veg ?? null, p_only_available: p.onlyAvailable ?? false, p_lat: p.lat ?? null, p_lng: p.lng ?? null,
      p_radius_km: p.radiusKm ?? null, p_sort: p.sort ?? "relevance", p_cursor: p.cursor ?? 0, p_limit: p.limit ?? 20,
    })
    return { items: rows, nextCursor: rows[0]?.next_cursor ?? null }
  },
  detail: (slug) => rpc<PlaceDetail | null>("public_place_detail", { p_slug: slug }),
  stats: () => rpc<PublicStats>("public_stats"),
  suggest: (q) => rpc<Suggestion[]>("public_suggest", { p_q: q }),
  cities: () => rpc<CityCount[]>("public_cities"),
  async menusToday(slugs) {
    const out = await Promise.all(slugs.map(async (slug) => {
      const [menu, d] = await Promise.all([rpc<MenuDay | null>("public_menu", { p_slug: slug }), rpc<PlaceDetail | null>("public_place_meta", { p_slug: slug })])
      return menu && d && menu.meals.length ? { slug, name: d.name, area: d.area, menu } : null
    }))
    return out.filter((x): x is NonNullable<typeof x> => x !== null)
  },
}
