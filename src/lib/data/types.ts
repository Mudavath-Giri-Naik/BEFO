/** Shapes returned by the public RPCs (supabase/migrations/*_public_api.sql). Money is paise. */
export type BusinessType = "mess" | "hostel" | "tiffin" | "other"
export type Audience = "boys" | "girls" | "coed" | "any"
export type Availability = "free" | "full" | "ask" | "none"

export interface PlaceCard {
  slug: string
  name: string
  business_type: BusinessType
  city: string
  audience: Audience
  area: string
  headline: string | null
  amenities: string[]
  veg_type: "veg" | "nonveg" | "both" | null
  min_price_paise: number | null
  beds_free: number | null
  availability: Availability
  availability_updated_at: string | null
  verified: boolean
  cover_path: string | null
  lat: number | null
  lng: number | null
  distance_km?: number | null
}

export interface MenuMeal { meal: "breakfast" | "lunch" | "snacks" | "dinner"; items: string[]; closed: boolean; note: string | null; veg_type: string | null; special: boolean }
export interface MenuDay { date: string; meals: MenuMeal[] }

export interface RoomTypePublic {
  id: string; name: string; beds_per_room: number; ac: boolean; attached_bath: boolean
  monthly_price_paise: number; deposit_paise: number; description: string | null
  beds_total: number | null; beds_free: number | null
}

export interface PlaceDetail extends Omit<PlaceCard, "cover_path" | "distance_km"> {
  about: string | null
  landmarks: string[]
  rules: string | null
  rules_structured: { curfew?: string; visitors?: string; notice_days?: number }
  food_info: { veg_type?: string; meals?: string[] }
  meal_timings: Partial<Record<MenuMeal["meal"], string>>
  verified_at: string | null
  address_public_level: "area_only" | "full"
  address: string | null
  phone: string | null
  brand_color: string
  logo_path: string | null
  updated_at: string
  photos: { path: string; alt: string | null; kind: string }[]
  plans: { id: string; name: string; price_paise: number; period_unit: string; period_count: number; description: string | null }[]
  room_types: RoomTypePublic[]
  menu_today: MenuDay | null
  menu_week: { weekday: number; meal: MenuMeal["meal"]; items: string[]; veg_type: string }[]
}

export interface SearchParams {
  q?: string; type?: BusinessType; audience?: Audience; city?: string; area?: string
  minPrice?: number; maxPrice?: number; amenities?: string[]; veg?: "veg" | "nonveg"
  onlyAvailable?: boolean; lat?: number; lng?: number; radiusKm?: number
  sort?: "relevance" | "nearest" | "price_asc" | "beds_free" | "recent"; cursor?: number; limit?: number
}
export interface SearchResult { items: PlaceCard[]; nextCursor: number | null }
export interface PublicStats { places: number; beds_free: number; cities: number; messes: number; hostels: number }
export interface Suggestion { label: string; kind: "city" | "area" | "landmark"; city: string }
export interface CityCount { city: string; places: number; hostels: number; messes: number }

export interface PublicApi {
  search(p: SearchParams): Promise<SearchResult>
  detail(slug: string): Promise<PlaceDetail | null>
  stats(): Promise<PublicStats>
  suggest(q: string): Promise<Suggestion[]>
  cities(): Promise<CityCount[]>
  menusToday(slugs: string[]): Promise<{ slug: string; name: string; area: string; menu: MenuDay }[]>
}
