import { ArrowUpDown, Building2, Landmark, List, Map as MapIcon, MapPin, Search, SlidersHorizontal, X } from "lucide-react"
import { lazy, Suspense, useId, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { AMENITIES } from "@/components/befo/amenity"
import { PlaceCard } from "@/components/befo/place-card"
import { usePlaces, useSuggest, type SearchParams } from "@/lib/data"
import { comparePlaces } from "@/lib/local-list"
import { formatRupees } from "@/lib/money"
import { usePageMeta } from "@/lib/meta"
import { cn } from "@/lib/utils"

const PlaceMap = lazy(() => import("@/components/befo/place-map"))
const PRICE_MAX = 20000

function readParams(sp: URLSearchParams): SearchParams {
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined)
  return {
    q: sp.get("q") ?? undefined,
    type: (sp.get("type") as SearchParams["type"]) ?? undefined,
    audience: (sp.get("audience") as SearchParams["audience"]) ?? undefined,
    city: sp.get("city") ?? undefined,
    minPrice: num("min") != null ? num("min")! * 100 : undefined,
    maxPrice: num("max") != null ? num("max")! * 100 : undefined,
    amenities: sp.get("amenities")?.split(",").filter(Boolean),
    veg: (sp.get("veg") as SearchParams["veg"]) ?? undefined,
    onlyAvailable: sp.get("free") === "1",
    lat: num("lat"), lng: num("lng"),
    sort: (sp.get("sort") as SearchParams["sort"]) ?? undefined,
  }
}

export default function ExplorePage({ presetType }: { presetType?: "hostel" | "mess" }) {
  const { t } = useTranslation()
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const params = useMemo(() => ({ ...readParams(sp), ...(presetType && !sp.get("type") ? { type: presetType } : {}) }), [sp, presetType])
  const [cursor, setCursor] = useState(0)
  const [view, setView] = useState<"list" | "map">("list")
  const { data, isLoading, isFetching, isError, refetch } = usePlaces({ ...params, limit: 24, cursor: 0 })
  const more = usePlaces({ ...params, limit: 24, cursor })
  const items = cursor ? [...(data?.items ?? []), ...(more.data?.items ?? [])] : data?.items ?? []
  const compared = comparePlaces.use()
  usePageMeta({ title: presetType === "mess" ? t("nav.mess") : presetType === "hostel" ? t("nav.hostels") : t("explore.title") })

  // functional update, so several changes in one tap (e.g. min + max) all apply
  const set = (k: string, v: string | null) => {
    setCursor(0)
    setSp((prev) => {
      const next = new URLSearchParams(prev)
      if (v === null || v === "") next.delete(k)
      else next.set(k, v)
      return next
    }, { replace: true })
  }
  const activeCount = ["audience", "min", "max", "amenities", "veg", "free", "city"].filter((k) => sp.get(k)).length

  const [filtersOpen, setFiltersOpen] = useState(false)
  const clearAll = () => { setSp(new URLSearchParams(sp.get("q") ? { q: sp.get("q")! } : {}), { replace: true }); setCursor(0) }
  // on /hostels or /messes, picking another type moves to /explore so "All" really means all
  const setType = (v: string) => {
    const next = new URLSearchParams(sp)
    if (v === "all") next.delete("type"); else next.set("type", v)
    setCursor(0)
    if (presetType) nav(`/explore${next.size ? `?${next}` : ""}`)
    else setSp(next, { replace: true })
  }
  const filters = <Filters params={params} set={set} />

  return (
    <div className="mx-auto max-w-6xl px-4 pb-6">
      <SearchPill key={sp.get("q") ?? ""} defaultQ={params.q ?? ""} activeCount={activeCount}
        onSearch={(q) => set("q", q || null)} onOpenFilters={() => setFiltersOpen(true)} />
      <ChipRow params={params} set={set} onType={setType} clearAll={clearAll} />
      <div className="mt-4 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label={t("explore.filters")}>
          <div className="sticky top-28 space-y-6 rounded-[28px] border border-foreground/12 p-5">{filters}</div>
        </aside>
        <section aria-live="polite">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[15px]">
              <span className="font-semibold">{isLoading ? t("common.loading") : t("explore.results", { count: items.length })}</span>
              {params.q && <span className="text-muted-foreground"> · “{params.q}”</span>}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <Select value={params.sort ?? "relevance"} onValueChange={(v) => set("sort", v === "relevance" ? null : v)}>
                <SelectTrigger className="h-9 gap-1 rounded-full border-0 bg-transparent px-3 text-[14px] shadow-none hover:bg-muted" aria-label={t("explore.sort")}>
                  <ArrowUpDown className="size-4 text-muted-foreground" aria-hidden /><SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="relevance">{t("explore.sortRelevance")}</SelectItem>
                  {params.lat != null && <SelectItem value="nearest">{t("explore.sortNearest")}</SelectItem>}
                  <SelectItem value="price_asc">{t("explore.sortPrice")}</SelectItem>
                  <SelectItem value="beds_free">{t("explore.sortBeds")}</SelectItem>
                  <SelectItem value="recent">{t("explore.sortRecent")}</SelectItem>
                </SelectContent>
              </Select>
              <div role="radiogroup" aria-label="View" className="flex rounded-full border border-foreground/12 p-0.5">
                {([["list", List, t("explore.list")], ["map", MapIcon, t("explore.map")]] as const).map(([v, Icon, label]) => (
                  <button key={v} type="button" role="radio" aria-checked={view === v} aria-label={label} onClick={() => setView(v)}
                    className={cn("flex size-9 items-center justify-center rounded-full transition-colors", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                    <Icon className="size-[18px]" strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DrawerContent className="max-h-[90dvh]">
              <DrawerHeader><DrawerTitle>{t("explore.filters")}</DrawerTitle></DrawerHeader>
              <div className="overflow-y-auto px-4 pb-2" data-lenis-prevent>{filters}</div>
              <DrawerFooter className="flex-row">
                <Button variant="ghost" className="h-12 flex-1 rounded-full" onClick={clearAll}>{t("explore.clear")}</Button>
                <DrawerClose asChild><Button className="h-12 flex-1 rounded-full">{t("explore.apply")}{items.length ? ` · ${items.length}` : ""}</Button></DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

          {isError ? (
            <div className="rounded-xl border p-8 text-center"><p>{t("common.somethingWrong")}</p><Button className="mt-4" onClick={() => refetch()}>{t("common.retry")}</Button></div>
          ) : isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-80 rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              {[...sp.keys()].length === 0 ? (
                <>
                  <p className="text-lg font-semibold">{t("explore.emptyAll")}</p>
                  <p className="mt-1 text-muted-foreground">{t("explore.emptyAllHint")}</p>
                  <Button asChild variant="outline" className="mt-4 h-11 rounded-full"><Link to="/list-your-place">{t("explore.emptyAllCta")}</Link></Button>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold">{t("explore.empty")}</p>
                  <p className="mt-1 text-muted-foreground">{t("explore.emptyHint")}</p>
                  <Button variant="outline" className="mt-4 h-11 rounded-full" onClick={() => setSp(new URLSearchParams())}><X className="size-4" />{t("explore.clear")}</Button>
                </>
              )}
            </div>
          ) : view === "map" ? (
            <Suspense fallback={<Skeleton className="h-[60dvh] rounded-xl" />}>
              <PlaceMap className="h-[60dvh] overflow-hidden rounded-xl border"
                points={items.filter((p) => p.lat != null).map((p) => ({ slug: p.slug, name: p.name, lat: p.lat!, lng: p.lng!, label: p.availability === "free" ? t(p.business_type === "hostel" ? "availability.free" : "availability.seats", { count: p.beds_free ?? 0 }) : undefined }))}
                onSelect={(slug) => nav(`/p/${slug}`)} />
            </Suspense>
          ) : (
            <>
              <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${isFetching ? "opacity-70" : ""}`}>
                {items.map((p, i) => <PlaceCard key={p.slug} place={p} index={i} />)}
              </div>
              {(cursor ? more.data?.nextCursor : data?.nextCursor) != null && (
                <div className="mt-6 text-center">
                  <Button variant="outline" className="h-11" disabled={more.isFetching} onClick={() => setCursor((cursor ? more.data?.nextCursor : data?.nextCursor) ?? 0)}>{t("explore.loadMore")}</Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      {compared.length >= 2 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-semibold">{compared.length} / 3</span>
            <div className="flex gap-2">
              <Button variant="ghost" className="h-11" onClick={() => comparePlaces.clear()}>{t("explore.clear")}</Button>
              <Button asChild className="h-11"><Link to={`/compare?ids=${compared.join(",")}`}>{t("common.compare")}</Link></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Filters({ params, set }: { params: SearchParams; set: (k: string, v: string | null) => void }) {
  const { t } = useTranslation()
  const lo = (params.minPrice ?? 0) / 100
  const hi = (params.maxPrice ?? PRICE_MAX * 100) / 100
  const [range, setRange] = useState<[number, number]>([lo, hi])
  const amen = params.amenities ?? []
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2.5 text-[15px] font-semibold">{t("explore.audience")}</legend>
        <ChoiceChips value={params.audience ?? "all"} onChange={(v) => set("audience", v === "all" ? null : v)}
          options={(["all", "boys", "girls", "coed"] as const).map((v) => [v, v === "all" ? t("explore.all") : t(`types.${v}`)])} />
      </fieldset>
      <fieldset>
        <legend className="mb-3 flex w-full justify-between text-[15px] font-semibold"><span>{t("explore.price")}</span>
          <span className="font-normal text-muted-foreground tabular-nums">{formatRupees(range[0] * 100)} – {range[1] >= PRICE_MAX ? `${formatRupees(PRICE_MAX * 100)}+` : formatRupees(range[1] * 100)}</span></legend>
        <Slider min={0} max={PRICE_MAX} step={500} value={range} onValueChange={(v) => setRange([v[0], v[1]])}
          onValueCommit={(v) => { set("min", v[0] > 0 ? String(v[0]) : null); set("max", v[1] < PRICE_MAX ? String(v[1]) : null) }}
          aria-label={t("explore.price")} className="py-2" />
      </fieldset>
      <fieldset>
        <legend className="mb-2.5 text-[15px] font-semibold">{t("explore.food")}</legend>
        <ChoiceChips value={params.veg ?? "all"} onChange={(v) => set("veg", v === "all" ? null : v)}
          options={[["all", t("explore.all")], ["veg", t("explore.veg")], ["nonveg", t("explore.nonveg")]]} />
      </fieldset>
      <fieldset>
        <legend className="mb-2.5 text-[15px] font-semibold">{t("explore.amenities")}</legend>
        <div className="grid grid-cols-2 gap-1">
          {Object.keys(AMENITIES).map((a) => (
            <Label key={a} className="flex min-h-11 cursor-pointer items-center gap-2 font-normal">
              <Checkbox checked={amen.includes(a)} onCheckedChange={(c) => set("amenities", (c ? [...amen, a] : amen.filter((x) => x !== a)).join(",") || null)} />
              {t(`amenity.${a}`)}
            </Label>
          ))}
        </div>
      </fieldset>
      <Label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 font-bold">
        {t("explore.onlyFree")}
        <Switch checked={!!params.onlyAvailable} onCheckedChange={(c) => set("free", c ? "1" : null)} />
      </Label>
    </div>
  )
}

/** One pill: search field with place suggestions, and the filters button (phones) inside it. */
function SearchPill({ defaultQ, activeCount, onSearch, onOpenFilters }: { defaultQ: string; activeCount: number; onSearch: (q: string) => void; onOpenFilters: () => void }) {
  const { t } = useTranslation()
  const [q, setQ] = useState(defaultQ)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const { data: sugg = [] } = useSuggest(q)
  const listId = useId()
  const go = (v: string) => { setOpen(false); onSearch(v.trim()) }
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); go(active >= 0 && sugg[active] ? sugg[active].label : q) }}
      className="relative flex h-14 items-center gap-1 rounded-full border border-foreground/12 bg-card pr-1.5 pl-4 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.25)] focus-within:ring-[3px] focus-within:ring-ring/30">
      <Search className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1) }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, sugg.length - 1)) }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)) }
          if (e.key === "Escape") setOpen(false)
        }}
        placeholder={t("home.searchPlaceholder")} aria-label={t("home.searchPlaceholder")} enterKeyHint="search" autoComplete="off"
        role="combobox" aria-expanded={open && sugg.length > 0} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className="h-full min-w-0 flex-1 bg-transparent px-2 text-[16px] outline-none placeholder:text-muted-foreground" />
      {q && <button type="button" onClick={() => { setQ(""); go("") }} aria-label="Clear search" className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><X className="size-4" /></button>}
      <button type="button" onClick={onOpenFilters} aria-label={`${t("explore.filters")}${activeCount ? ` (${activeCount})` : ""}`}
        className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground lg:hidden">
        <SlidersHorizontal className="size-[18px]" strokeWidth={1.75} />
        {activeCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-card bg-brand text-[10px] font-semibold text-white">{activeCount}</span>}
      </button>
      <button type="submit" aria-label={t("home.search")} className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground lg:flex">
        <Search className="size-[18px]" strokeWidth={1.75} />
      </button>
      {open && sugg.length > 0 && (
        <ul id={listId} role="listbox" className="absolute top-[calc(100%+8px)] right-0 left-0 z-30 overflow-hidden rounded-[24px] border border-foreground/10 bg-popover p-1.5 shadow-xl">
          {sugg.map((x, i) => {
            const Icon = x.kind === "city" ? Building2 : x.kind === "landmark" ? Landmark : MapPin
            return (
              <li key={x.kind + x.label} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); setQ(x.label); go(x.label) }}
                className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 rounded-2xl px-3 text-[15px]", i === active ? "bg-muted" : "hover:bg-muted/70")}>
                <Icon className="size-4 text-muted-foreground" aria-hidden /><span className="font-medium">{x.label}</span>
                {x.kind !== "city" && <span className="text-muted-foreground">{x.city}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </form>
  )
}

/** Type chips first, then every active filter as a removable chip — all in one swipeable row. */
function ChipRow({ params, set, onType, clearAll }: { params: SearchParams; set: (k: string, v: string | null) => void; onType: (v: string) => void; clearAll: () => void }) {
  const { t } = useTranslation()
  const type = params.type ?? "all"
  const active: { key: string; label: string; remove: () => void }[] = []
  if (params.audience) active.push({ key: "aud", label: t(`types.${params.audience}`), remove: () => set("audience", null) })
  if (params.minPrice != null || params.maxPrice != null) {
    const lo = params.minPrice != null ? formatRupees(params.minPrice) : null
    const hi = params.maxPrice != null ? formatRupees(params.maxPrice) : null
    active.push({ key: "price", label: lo && hi ? `${lo}–${hi}` : hi ? `Under ${hi}` : `Over ${lo}`, remove: () => { set("min", null); set("max", null) } })
  }
  if (params.veg) active.push({ key: "veg", label: params.veg === "veg" ? t("explore.veg") : t("explore.nonveg"), remove: () => set("veg", null) })
  if (params.onlyAvailable) active.push({ key: "free", label: "Free beds", remove: () => set("free", null) })
  if (params.city) active.push({ key: "city", label: params.city, remove: () => set("city", null) })
  for (const a of params.amenities ?? []) active.push({ key: `a-${a}`, label: t(`amenity.${a}`), remove: () => set("amenities", (params.amenities ?? []).filter((x) => x !== a).join(",") || null) })
  return (
    <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max items-center gap-2">
        <div role="radiogroup" aria-label={t("explore.type")} className="flex items-center gap-1.5">
          {(["all", "hostel", "mess", "tiffin"] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={type === v} onClick={() => onType(v)}
              className={cn("h-9 rounded-full border px-4 text-[14px] whitespace-nowrap transition-colors",
                type === v ? "border-primary bg-primary text-primary-foreground" : "border-foreground/12 text-muted-foreground hover:text-foreground")}>
              {v === "all" ? t("explore.all") : t(`types.${v}`)}
            </button>
          ))}
        </div>
        {active.length > 0 && <span className="mx-1 h-5 w-px bg-foreground/15" aria-hidden />}
        {active.map((c) => (
          <button key={c.key} type="button" onClick={c.remove} aria-label={`Remove ${c.label}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-soft pr-2.5 pl-3.5 text-[14px] whitespace-nowrap text-brand-strong">
            {c.label}<X className="size-3.5" strokeWidth={2.25} />
          </button>
        ))}
        {active.length > 1 && <button type="button" onClick={clearAll} className="h-9 px-2 text-[14px] whitespace-nowrap text-muted-foreground underline-offset-4 hover:underline">{t("explore.clear")}</button>}
      </div>
    </div>
  )
}

function ChoiceChips({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: (readonly [string, string])[] }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={cn("h-10 rounded-full border px-4 text-[14px] transition-colors",
            value === v ? "border-primary bg-primary text-primary-foreground" : "border-foreground/12 text-muted-foreground hover:text-foreground")}>
          {label}
        </button>
      ))}
    </div>
  )
}
