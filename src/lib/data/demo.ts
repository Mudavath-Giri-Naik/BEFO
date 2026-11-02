/**
 * Demo data source (VITE_DATA_SOURCE=demo, and the /demo page). Client-side fixtures that go
 * through the same UI components as real data. All places and people are fictional.
 */
import { photo, type PhotoKey } from "@/components/site/media"
import { tenantToday, weekday } from "@/lib/dates"
import type { CityCount, MenuDay, MenuMeal, PlaceCard, PlaceDetail, PublicApi, PublicStats, RoomTypePublic, SearchParams, SearchResult, Suggestion } from "./types"

const H = 3_600_000
const ago = (hours: number) => new Date(Date.now() - hours * H).toISOString()

type Week = Partial<Record<MenuMeal["meal"], string[][]>> // index by weekday 0..6

interface Fixture extends Omit<PlaceDetail, "menu_today" | "menu_week"> {
  week?: Week
}

const andhraVeg: Week = {
  breakfast: [["Pesarattu", "Upma", "Ginger chutney"], ["Idli", "Sambar", "Coconut chutney"], ["Puri", "Aloo curry"], ["Dosa", "Peanut chutney"], ["Upma", "Chutney"], ["Idli", "Vada", "Sambar"], ["Uggani", "Mirchi bajji"]],
  lunch: [["Rice", "Tomato pappu", "Bendakaya fry", "Rasam", "Curd"], ["Rice", "Dosakaya pappu", "Aloo fry", "Sambar", "Curd"], ["Rice", "Palakura pappu", "Beerakaya curry", "Rasam", "Curd"], ["Rice", "Mudda pappu", "Gongura pachadi", "Sambar", "Curd"], ["Rice", "Majjiga pulusu", "Cabbage fry", "Curd"], ["Rice", "Gutti vankaya", "Rasam", "Curd"], ["Veg pulao", "Raita", "Gulab jamun"]],
  dinner: [["Chapati", "Aloo kurma", "Rice", "Rasam"], ["Chapati", "Mixed veg", "Rice", "Dal"], ["Phulka", "Paneer curry", "Rice", "Rasam"], ["Chapati", "Chana masala", "Rice", "Dal"], ["Phulka", "Dal tadka", "Rice", "Rasam"], ["Chapati", "Veg kurma", "Rice", "Curd"], ["Fried rice", "Gobi manchurian"]],
}
const andhraMixed: Week = {
  ...andhraVeg,
  lunch: [
    ["Chicken biryani", "Raita", "Mirchi ka salan"], andhraVeg.lunch![1], andhraVeg.lunch![2], ["Rice", "Egg curry", "Rasam", "Curd"],
    andhraVeg.lunch![4], andhraVeg.lunch![5], ["Rice", "Fish pulusu", "Rasam", "Curd"],
  ],
}

const rt = (id: string, name: string, beds: number, ac: boolean, bath: boolean, price: number, deposit: number, total: number, free: number): RoomTypePublic => ({
  id, name, beds_per_room: beds, ac, attached_bath: bath, monthly_price_paise: price * 100, deposit_paise: deposit * 100, description: null, beds_total: total, beds_free: free,
})

const FIXTURES: Fixture[] = [
  {
    slug: "annapurna-mess", name: "Annapurna Mess", business_type: "mess", city: "Vizianagaram", area: "Chintalavalasa", audience: "any",
    headline: "Home-style veg and non-veg meals, three times a day, near MVGR", about: "Family-run mess serving students since 2012. Unlimited rice and curry at lunch. Sunday special biryani.",
    amenities: ["ro_water", "power_backup", "parking"], veg_type: "both", min_price_paise: 240000, beds_free: 38, availability: "free", availability_updated_at: ago(3), verified: true,
    lat: 18.0602, lng: 83.405, landmarks: ["MVGR College", "Chintalavalasa bus stop"], rules: "Monthly plan starts on the day you pay. Show your ID card at the counter.",
    rules_structured: {}, food_info: { veg_type: "both", meals: ["breakfast", "lunch", "dinner"] }, meal_timings: { breakfast: "07:30–09:30", lunch: "12:30–14:30", dinner: "19:30–21:30" },
    verified_at: ago(480), address_public_level: "full", address: "Door 4-12, Main Road, Chintalavalasa, Vizianagaram 535005", phone: "+919000000001",
    brand_color: "turmeric", logo_path: null, updated_at: ago(3), photos: [],
    plans: [{ id: "p1", name: "Monthly mess (3 meals)", price_paise: 300000, period_unit: "month", period_count: 1, description: "Breakfast, lunch and dinner" },
            { id: "p2", name: "Lunch + dinner", price_paise: 240000, period_unit: "month", period_count: 1, description: null }],
    room_types: [], week: andhraMixed,
  },
  {
    slug: "sai-krishna-boys-hostel", name: "Sai Krishna Boys Hostel", business_type: "hostel", city: "Vizianagaram", area: "Chintalavalasa", audience: "boys",
    headline: "Clean rooms, Wi-Fi and food, five minutes from MVGR", about: "Two floors of 2- and 3-sharing rooms with attached bathrooms. Breakfast and dinner included.",
    amenities: ["wifi", "geyser", "laundry", "cctv", "power_backup", "ro_water"], veg_type: "both", min_price_paise: 550000, beds_free: 6, availability: "free", availability_updated_at: ago(20), verified: false,
    lat: 18.0631, lng: 83.4021, landmarks: ["MVGR College"], rules: "Gate closes 22:30. Visitors in the lobby only. One month notice before leaving.",
    rules_structured: { curfew: "22:30", visitors: "Lobby only", notice_days: 30 }, food_info: { veg_type: "both", meals: ["breakfast", "dinner"] }, meal_timings: { breakfast: "07:00–09:00", dinner: "19:30–21:30" },
    verified_at: null, address_public_level: "full", address: "Plot 21, Behind SBI, Chintalavalasa, Vizianagaram 535005", phone: null,
    brand_color: "indigo", logo_path: null, updated_at: ago(20), photos: [], plans: [],
    room_types: [rt("r1", "2-sharing", 2, false, true, 6500, 6500, 8, 2), rt("r2", "3-sharing", 3, false, true, 5500, 5500, 18, 4)],
  },
  {
    slug: "sri-lakshmi-ladies-hostel", name: "Sri Lakshmi Ladies Hostel", business_type: "hostel", city: "Visakhapatnam", area: "Madhurawada", audience: "girls",
    headline: "Safe ladies hostel with a resident warden, near the IT park", about: "Biometric entry, CCTV in common areas, a resident warden and home food. AC and non-AC rooms.",
    amenities: ["wifi", "ac", "geyser", "cctv", "housekeeping", "laundry", "power_backup", "ro_water", "lift"], veg_type: "veg", min_price_paise: 750000, beds_free: 4, availability: "free", availability_updated_at: ago(30), verified: true,
    lat: 17.82, lng: 83.352, landmarks: ["IT SEZ", "Madhurawada bus stop"], rules: "Gate closes 21:00. No male visitors beyond the reception.",
    rules_structured: { curfew: "21:00", visitors: "Reception only", notice_days: 30 }, food_info: { veg_type: "veg", meals: ["breakfast", "dinner"] }, meal_timings: { breakfast: "07:30–09:00", dinner: "19:30–21:00" },
    verified_at: ago(120), address_public_level: "area_only", address: null, phone: null,
    brand_color: "plum", logo_path: null, updated_at: ago(30), photos: [], plans: [],
    room_types: [rt("r3", "2-sharing AC", 2, true, true, 9500, 10000, 10, 1), rt("r4", "3-sharing", 3, false, true, 7500, 7500, 15, 3)], week: { breakfast: andhraVeg.breakfast, dinner: andhraVeg.dinner },
  },
  {
    slug: "green-leaf-veg-mess", name: "Green Leaf Veg Mess", business_type: "mess", city: "Visakhapatnam", area: "MVP Colony", audience: "any",
    headline: "Pure veg thali, Andhra style, with unlimited curd rice", about: "A small kitchen run by two sisters. Lunch boxes packed on request.",
    amenities: ["ro_water"], veg_type: "veg", min_price_paise: 270000, beds_free: 12, availability: "free", availability_updated_at: ago(50), verified: true,
    lat: 17.741, lng: 83.336, landmarks: ["MVP Rythu Bazaar"], rules: null, rules_structured: {}, food_info: { veg_type: "veg", meals: ["lunch", "dinner"] },
    meal_timings: { lunch: "12:00–14:30", dinner: "19:00–21:30" }, verified_at: ago(900), address_public_level: "full", address: "Sector 6, MVP Colony, Visakhapatnam 530017", phone: null,
    brand_color: "leaf", logo_path: null, updated_at: ago(50), photos: [],
    plans: [{ id: "p3", name: "Lunch + dinner", price_paise: 270000, period_unit: "month", period_count: 1, description: null }], room_types: [], week: { lunch: andhraVeg.lunch, dinner: andhraVeg.dinner },
  },
  {
    slug: "harbour-view-coliving", name: "Harbour View Co-living", business_type: "hostel", city: "Visakhapatnam", area: "Rushikonda", audience: "coed",
    headline: "Private rooms for working professionals, 10 minutes from the beach", about: "Separate floors for men and women. Shared kitchen and a quiet work lounge.",
    amenities: ["wifi", "ac", "geyser", "housekeeping", "power_backup", "parking", "lift"], veg_type: null, min_price_paise: 1100000, beds_free: 0, availability: "full", availability_updated_at: ago(70), verified: false,
    lat: 17.783, lng: 83.384, landmarks: ["GITAM University", "Rushikonda beach"], rules: "Separate floors for men and women. Quiet hours after 23:00.",
    rules_structured: { visitors: "Lounge only", notice_days: 30 }, food_info: {}, meal_timings: {}, verified_at: null, address_public_level: "area_only", address: null, phone: null,
    brand_color: "ocean", logo_path: null, updated_at: ago(70), photos: [], plans: [],
    room_types: [rt("r5", "Single AC", 1, true, true, 14000, 20000, 12, 0), rt("r6", "2-sharing AC", 2, true, true, 11000, 15000, 16, 0)],
  },
  {
    slug: "vijaya-durga-girls-hostel", name: "Vijaya Durga Girls Hostel", business_type: "hostel", city: "Vizianagaram", area: "Cantonment", audience: "girls",
    headline: "Affordable girls hostel with three meals, walking distance to the bus stand", about: "Run by a retired teacher. Study hall open till midnight during exams.",
    amenities: ["geyser", "cctv", "ro_water", "power_backup"], veg_type: "veg", min_price_paise: 450000, beds_free: null, availability: "ask", availability_updated_at: null, verified: false,
    lat: 18.111, lng: 83.408, landmarks: ["RTC complex"], rules: "Gate closes 20:30.", rules_structured: { curfew: "20:30", visitors: "Reception only", notice_days: 15 },
    food_info: { veg_type: "veg", meals: ["breakfast", "lunch", "dinner"] }, meal_timings: { breakfast: "07:00–08:30", dinner: "19:00–20:30" },
    verified_at: null, address_public_level: "area_only", address: null, phone: null, brand_color: "brick", logo_path: null, updated_at: ago(400), photos: [], plans: [],
    room_types: [rt("r7", "4-sharing", 4, false, false, 4500, 3000, 24, 0)], week: { breakfast: andhraVeg.breakfast, dinner: andhraVeg.dinner },
  },
  {
    slug: "amma-tiffins", name: "Amma Tiffins", business_type: "tiffin", city: "Visakhapatnam", area: "Gajuwaka", audience: "any",
    headline: "Lunch boxes delivered to offices and hostels by 12:30", about: "Two curries, dal, rice and curd in a steel box. Boxes collected the next day.",
    amenities: [], veg_type: "veg", min_price_paise: 180000, beds_free: null, availability: "none", availability_updated_at: null, verified: false,
    lat: 17.69, lng: 83.21, landmarks: ["Gajuwaka junction"], rules: null, rules_structured: {}, food_info: { veg_type: "veg", meals: ["lunch"] }, meal_timings: { lunch: "Delivered by 12:30" },
    verified_at: null, address_public_level: "area_only", address: null, phone: null, brand_color: "teal", logo_path: null, updated_at: ago(10), photos: [],
    plans: [{ id: "p4", name: "Monthly lunch box (weekdays)", price_paise: 180000, period_unit: "month", period_count: 1, description: "Monday to Saturday" }], room_types: [], week: { lunch: andhraVeg.lunch },
  },
  {
    slug: "srinivasa-boys-pg", name: "Srinivasa Boys PG", business_type: "hostel", city: "Visakhapatnam", area: "Madhurawada", audience: "boys",
    headline: "Budget PG with Wi-Fi and two meals, near the IT SEZ", about: "Simple rooms, reliable power backup, washing machine on every floor.",
    amenities: ["wifi", "laundry", "power_backup", "ro_water"], veg_type: "both", min_price_paise: 480000, beds_free: 9, availability: "free", availability_updated_at: ago(6), verified: true,
    lat: 17.816, lng: 83.357, landmarks: ["IT SEZ"], rules: "Gate closes 23:00.", rules_structured: { curfew: "23:00", notice_days: 30 },
    food_info: { veg_type: "both", meals: ["breakfast", "dinner"] }, meal_timings: { breakfast: "07:30–09:30", dinner: "20:00–22:00" },
    verified_at: ago(300), address_public_level: "full", address: "Door 7-45, Near Water Tank, Madhurawada, Visakhapatnam 530048", phone: null,
    brand_color: "slate", logo_path: null, updated_at: ago(6), photos: [], plans: [],
    room_types: [rt("r8", "3-sharing", 3, false, true, 5200, 5000, 21, 5), rt("r9", "4-sharing", 4, false, false, 4800, 4000, 16, 4)],
  },
]

function menuFor(f: Fixture, date: string): MenuDay | null {
  if (!f.week) return null
  const wd = weekday(date)
  const meals = (["breakfast", "lunch", "snacks", "dinner"] as const)
    .filter((m) => f.week![m])
    .map((m) => ({ meal: m, items: f.week![m]![wd], closed: false, note: null, veg_type: f.veg_type === "veg" ? "veg" : "mixed", special: false }))
  return { date, meals }
}

/** Demo only: stock photos stand in for owner photos so the example listings look real. */
const DEMO_COVERS: Record<string, PhotoKey> = {
  "annapurna-mess": "thaliSteel", "sai-krishna-boys-hostel": "woodBunks", "sri-lakshmi-ladies-hostel": "bedWood",
  "green-leaf-veg-mess": "thali", "harbour-view-coliving": "deskBed", "vijaya-durga-girls-hostel": "linen",
  "amma-tiffins": "roundTray", "srinivasa-boys-pg": "bedsRow",
}
const cover = (slug: string) => (DEMO_COVERS[slug] ? photo(DEMO_COVERS[slug], 900, 560) : null)

function toCard(f: Fixture): PlaceCard {
  return {
    slug: f.slug, name: f.name, business_type: f.business_type, city: f.city, audience: f.audience, area: f.area, headline: f.headline,
    amenities: f.amenities, veg_type: f.veg_type, min_price_paise: f.min_price_paise, beds_free: f.beds_free, availability: f.availability,
    availability_updated_at: f.availability_updated_at, verified: f.verified, cover_path: cover(f.slug), lat: f.lat, lng: f.lng,
  }
}

function km(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = (d: number) => (d * Math.PI) / 180
  const x = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(x)) * 10) / 10
}

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120))

export const demoApi: PublicApi = {
  async search(p: SearchParams): Promise<SearchResult> {
    const q = p.q?.trim().toLowerCase()
    let items = FIXTURES.map(toCard).map((c) => ({ ...c, distance_km: p.lat != null && p.lng != null && c.lat != null && c.lng != null ? km(p.lat, p.lng, c.lat, c.lng) : null }))
    items = items.filter((c) =>
      (!p.type || c.business_type === p.type) &&
      (!p.audience || c.audience === p.audience || c.audience === "any") &&
      (!p.city || c.city.toLowerCase() === p.city.toLowerCase()) &&
      (p.minPrice == null || (c.min_price_paise ?? 0) >= p.minPrice) &&
      (p.maxPrice == null || (c.min_price_paise ?? Infinity) <= p.maxPrice) &&
      (!p.amenities?.length || p.amenities.every((a) => c.amenities.includes(a))) &&
      (!p.veg || (p.veg === "veg" ? c.veg_type === "veg" : c.veg_type === "nonveg" || c.veg_type === "both")) &&
      (!p.onlyAvailable || c.availability === "free") &&
      (p.radiusKm == null || c.distance_km == null || c.distance_km <= p.radiusKm) &&
      (!q || [c.name, c.area, c.city, ...(FIXTURES.find((f) => f.slug === c.slug)?.landmarks ?? [])].join(" ").toLowerCase().includes(q)))
    const s = p.sort ?? "relevance"
    items.sort((a, b) =>
      s === "nearest" ? (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9)
      : s === "price_asc" ? (a.min_price_paise ?? 1e12) - (b.min_price_paise ?? 1e12)
      : s === "beds_free" ? (b.beds_free ?? -1) - (a.beds_free ?? -1)
      : s === "recent" ? (b.availability_updated_at ?? "").localeCompare(a.availability_updated_at ?? "")
      : Number(b.verified) - Number(a.verified) || Number(b.availability === "free") - Number(a.availability === "free"))
    const off = p.cursor ?? 0
    const lim = Math.min(p.limit ?? 20, 24)
    return delay({ items: items.slice(off, off + lim), nextCursor: items.length > off + lim ? off + lim : null })
  },
  async detail(slug) {
    const f = FIXTURES.find((x) => x.slug === slug)
    if (!f) return delay(null)
    const today = tenantToday()
    const week = f.week
      ? (Object.entries(f.week) as [MenuMeal["meal"], string[][]][]).flatMap(([meal, days]) => days.map((items, wd) => ({ weekday: wd, meal, items, veg_type: "veg" })))
      : []
    const { week: _w, ...rest } = f
    const c = DEMO_COVERS[f.slug]
    const photos = c ? [{ path: photo(c, 1600), alt: f.name, kind: "room" }, { path: photo("chaise", 900), alt: "Common area", kind: "common" }, { path: photo("thali", 900), alt: "Food", kind: "food" }] : []
    return delay({ ...rest, photos, menu_today: menuFor(f, today), menu_week: week })
  },
  async stats(): Promise<PublicStats> {
    const cards = FIXTURES.map(toCard)
    return delay({
      places: cards.length,
      beds_free: cards.filter((c) => c.business_type === "hostel" && c.availability === "free").reduce((s, c) => s + (c.beds_free ?? 0), 0),
      cities: new Set(cards.map((c) => c.city)).size,
      messes: cards.filter((c) => c.business_type !== "hostel").length,
      hostels: cards.filter((c) => c.business_type === "hostel").length,
    })
  },
  async suggest(q): Promise<Suggestion[]> {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    const all: Suggestion[] = []
    for (const f of FIXTURES) {
      all.push({ label: f.city, kind: "city", city: f.city }, { label: f.area, kind: "area", city: f.city })
      for (const l of f.landmarks) all.push({ label: l, kind: "landmark", city: f.city })
    }
    const seen = new Set<string>()
    return delay(all.filter((x) => x.label.toLowerCase().includes(s) && !seen.has(x.label) && seen.add(x.label)).slice(0, 8))
  },
  async cities(): Promise<CityCount[]> {
    const m = new Map<string, CityCount>()
    for (const f of FIXTURES) {
      const c = m.get(f.city) ?? { city: f.city, places: 0, hostels: 0, messes: 0 }
      c.places++
      if (f.business_type === "hostel") c.hostels++
      else c.messes++
      m.set(f.city, c)
    }
    return delay([...m.values()].sort((a, b) => b.places - a.places))
  },
  async menusToday() {
    const today = tenantToday()
    return delay(FIXTURES.filter((f) => f.week && f.business_type !== "hostel").map((f) => ({ slug: f.slug, name: f.name, area: f.area, menu: menuFor(f, today)! })))
  },
}

/** Popular areas shown on the home page (demo + fallback). Real data comes from public_suggest/public_cities. */
export const DEMO_AREAS = [
  { label: "Chintalavalasa", city: "Vizianagaram", note: "MVGR College" },
  { label: "Madhurawada", city: "Visakhapatnam", note: "IT SEZ" },
  { label: "MVP Colony", city: "Visakhapatnam", note: "Rythu Bazaar" },
  { label: "Rushikonda", city: "Visakhapatnam", note: "GITAM" },
  { label: "Cantonment", city: "Vizianagaram", note: "RTC complex" },
  { label: "Gajuwaka", city: "Visakhapatnam", note: "Steel Plant road" },
]
