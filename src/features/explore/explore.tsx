import { List, Map as MapIcon, SlidersHorizontal, X } from "lucide-react"
import { lazy, Suspense, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { AMENITIES } from "@/components/befo/amenity"
import { PlaceCard } from "@/components/befo/place-card"
import { usePlaces, type SearchParams } from "@/lib/data"
import { comparePlaces } from "@/lib/local-list"
import { formatRupees } from "@/lib/money"
import { usePageMeta } from "@/lib/meta"
import { SearchBox } from "./search-box"

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

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(sp)
    if (v === null || v === "") next.delete(k)
    else next.set(k, v)
    setCursor(0)
    setSp(next, { replace: true })
  }
  const activeCount = ["type", "audience", "min", "max", "amenities", "veg", "free", "city"].filter((k) => sp.get(k)).length

  const filters = <Filters params={params} set={set} />

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <SearchBox key={sp.get("q") ?? ""} defaultQ={params.q ?? ""} defaultType={params.type ?? "all"} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label={t("explore.filters")}>
          <div className="sticky top-20 space-y-6">{filters}</div>
        </aside>
        <section aria-live="polite">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h1 className="mr-auto text-xl font-bold">
              {isLoading ? t("common.loading") : t("explore.results", { count: items.length })}
            </h1>
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" className="h-11 lg:hidden"><SlidersHorizontal className="size-4" />{t("explore.filters")}{activeCount > 0 && <Badge className="ml-1">{activeCount}</Badge>}</Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[90dvh]">
                <DrawerHeader><DrawerTitle>{t("explore.filters")}</DrawerTitle></DrawerHeader>
                <div className="overflow-y-auto px-4 pb-2">{filters}</div>
                <DrawerFooter className="flex-row">
                  <Button variant="ghost" className="h-12 flex-1" onClick={() => { setSp(new URLSearchParams(sp.get("q") ? { q: sp.get("q")! } : {})); setCursor(0) }}>{t("explore.clear")}</Button>
                  <DrawerClose asChild><Button className="h-12 flex-1">{t("explore.apply")}</Button></DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            <Select value={params.sort ?? "relevance"} onValueChange={(v) => set("sort", v === "relevance" ? null : v)}>
              <SelectTrigger className="h-11 w-auto min-w-40" aria-label={t("explore.sort")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">{t("explore.sortRelevance")}</SelectItem>
                {params.lat != null && <SelectItem value="nearest">{t("explore.sortNearest")}</SelectItem>}
                <SelectItem value="price_asc">{t("explore.sortPrice")}</SelectItem>
                <SelectItem value="beds_free">{t("explore.sortBeds")}</SelectItem>
                <SelectItem value="recent">{t("explore.sortRecent")}</SelectItem>
              </SelectContent>
            </Select>
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as "list" | "map")} variant="outline" aria-label="View">
              <ToggleGroupItem value="list" className="size-11" aria-label={t("explore.list")}><List className="size-5" /></ToggleGroupItem>
              <ToggleGroupItem value="map" className="size-11" aria-label={t("explore.map")}><MapIcon className="size-5" /></ToggleGroupItem>
            </ToggleGroup>
          </div>

          {isError ? (
            <div className="rounded-xl border p-8 text-center"><p>{t("common.somethingWrong")}</p><Button className="mt-4" onClick={() => refetch()}>{t("common.retry")}</Button></div>
          ) : isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-80 rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <p className="text-lg font-semibold">{t("explore.empty")}</p>
              <p className="mt-1 text-muted-foreground">{t("explore.emptyHint")}</p>
              {activeCount > 0 && <Button variant="outline" className="mt-4 h-11" onClick={() => setSp(new URLSearchParams())}><X className="size-4" />{t("explore.clear")}</Button>}
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
        <legend className="mb-2 text-sm font-bold">{t("explore.type")}</legend>
        <ToggleGroup type="single" variant="outline" value={params.type ?? "all"} onValueChange={(v) => set("type", !v || v === "all" ? null : v)} className="flex-wrap justify-start">
          {(["all", "hostel", "mess", "tiffin"] as const).map((v) => <ToggleGroupItem key={v} value={v} className="h-10 px-3">{v === "all" ? t("explore.all") : t(`types.${v}`)}</ToggleGroupItem>)}
        </ToggleGroup>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-bold">{t("explore.audience")}</legend>
        <ToggleGroup type="single" variant="outline" value={params.audience ?? "all"} onValueChange={(v) => set("audience", !v || v === "all" ? null : v)} className="flex-wrap justify-start">
          {(["all", "boys", "girls", "coed"] as const).map((v) => <ToggleGroupItem key={v} value={v} className="h-10 px-3">{v === "all" ? t("explore.all") : t(`types.${v}`)}</ToggleGroupItem>)}
        </ToggleGroup>
      </fieldset>
      <fieldset>
        <legend className="mb-3 flex w-full justify-between text-sm font-bold"><span>{t("explore.price")}</span>
          <span className="font-normal text-muted-foreground tabular-nums">{formatRupees(range[0] * 100)} – {range[1] >= PRICE_MAX ? `${formatRupees(PRICE_MAX * 100)}+` : formatRupees(range[1] * 100)}</span></legend>
        <Slider min={0} max={PRICE_MAX} step={500} value={range} onValueChange={(v) => setRange([v[0], v[1]])}
          onValueCommit={(v) => { set("min", v[0] > 0 ? String(v[0]) : null); set("max", v[1] < PRICE_MAX ? String(v[1]) : null) }}
          aria-label={t("explore.price")} className="py-2" />
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-bold">{t("explore.food")}</legend>
        <ToggleGroup type="single" variant="outline" value={params.veg ?? "all"} onValueChange={(v) => set("veg", !v || v === "all" ? null : v)} className="flex-wrap justify-start">
          <ToggleGroupItem value="all" className="h-10 px-3">{t("explore.all")}</ToggleGroupItem>
          <ToggleGroupItem value="veg" className="h-10 px-3">{t("explore.veg")}</ToggleGroupItem>
          <ToggleGroupItem value="nonveg" className="h-10 px-3">{t("explore.nonveg")}</ToggleGroupItem>
        </ToggleGroup>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-bold">{t("explore.amenities")}</legend>
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
