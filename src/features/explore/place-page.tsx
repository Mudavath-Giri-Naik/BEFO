import { BadgeCheck, Bath, Clock, Flag, Heart, MapPin, Phone, Share2, Snowflake, Users } from "lucide-react"
import { lazy, Suspense, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { AmenityList } from "@/components/befo/amenity"
import { AvailabilityBadge } from "@/components/befo/availability-badge"
import { typeLabel } from "@/components/befo/place-card"
import { PlaceCover } from "@/components/befo/place-cover"
import { FromPrice } from "@/components/befo/price"
import { TENANT_SWATCHES, type TenantSwatch } from "@/app/brand"
import { isDemoData } from "@/app/env"
import { usePlace, type PlaceDetail } from "@/lib/data"
import { timeAgo, tenantToday, weekday } from "@/lib/dates"
import { googleMapsLink } from "@/lib/geo"
import { savedPlaces } from "@/lib/local-list"
import { formatRupees } from "@/lib/money"
import { formatPhone } from "@/lib/phone"
import { usePageMeta } from "@/lib/meta"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const PlaceMap = lazy(() => import("@/components/befo/place-map"))
const MEALS = ["breakfast", "lunch", "snacks", "dinner"] as const
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function PlacePage() {
  const { slug = "" } = useParams()
  const { t } = useTranslation()
  const { data: p, isLoading } = usePlace(slug)
  usePageMeta({ title: p?.name, description: p?.headline ?? undefined })

  if (isLoading) return <div className="mx-auto max-w-5xl space-y-4 px-4 py-8"><Skeleton className="aspect-[16/7] rounded-2xl" /><Skeleton className="h-10 w-2/3" /><Skeleton className="h-40" /></div>
  if (!p) return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">{t("place.notFound")}</h1>
      <p className="mt-2 text-muted-foreground">{t("place.notFoundHint")}</p>
      <Button asChild className="mt-6 h-11"><Link to="/explore">{t("nav.explore")}</Link></Button>
    </div>
  )

  const hasRooms = p.room_types.length > 0
  const hasFood = !!p.menu_today?.meals.length || p.menu_week.length > 0 || Object.keys(p.meal_timings).length > 0
  const sections = [
    ["overview", t("place.overview")], hasRooms && ["rooms", t("place.rooms")], p.amenities.length > 0 && ["facilities", t("place.facilities")],
    hasFood && ["food", t("place.food")], (p.rules || Object.keys(p.rules_structured).length > 0) && ["rules", t("place.rules")],
    p.lat != null && ["location", t("place.location")],
  ].filter(Boolean) as [string, string][]
  const swatch = TENANT_SWATCHES[(p.brand_color as TenantSwatch) ?? "indigo"] ?? TENANT_SWATCHES.indigo

  return (
    <article className="pb-28 md:pb-12">
      {/* header in the place's brand colour (§22.2) */}
      <div style={{ background: swatch.bg, color: swatch.fg }}>
        <div className="mx-auto max-w-5xl px-4 pt-6 pb-5">
          <div className="flex flex-wrap items-center gap-2 text-sm opacity-90">
            <span className="font-semibold">{typeLabel(t, p)}</span><span aria-hidden>·</span>
            <span className="flex items-center gap-1"><MapPin className="size-4" aria-hidden />{p.area}, {p.city}</span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{p.name}</h1>
          {p.headline && <p className="mt-2 max-w-[65ch] text-lg opacity-90">{p.headline}</p>}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <Gallery p={p} />
        <nav className="sticky top-16 z-20 -mx-4 mt-4 overflow-x-auto border-b bg-background/95 px-4 backdrop-blur" aria-label="Sections">
          <ul className="flex gap-1">
            {sections.map(([id, label]) => (
              <li key={id}><a href={`#${id}`} className="flex h-12 items-center px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground hover:text-foreground">{label}</a></li>
            ))}
          </ul>
        </nav>

        <div className="grid gap-10 pt-6 md:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-12">
            <section id="overview" className="scroll-mt-32">
              <div className="flex flex-wrap items-center gap-3">
                <AvailabilityBadge availability={p.availability} beds={p.beds_free} type={p.business_type} className="h-8 px-3 text-sm" />
                {p.availability_updated_at && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="size-4" aria-hidden />{t("common.updatedAgo", { ago: timeAgo(p.availability_updated_at) })}</span>}
                {p.verified && <Badge variant="outline" className="h-8 gap-1.5 px-3 text-sm"><BadgeCheck className="size-4 text-primary" />{t("common.verified")}</Badge>}
              </div>
              {p.verified && <p className="mt-2 text-sm text-muted-foreground">{t("place.verifiedExplain")}</p>}
              {p.about && <p className="mt-4 max-w-[65ch] text-lg leading-relaxed">{p.about}</p>}
              {p.landmarks.length > 0 && <p className="mt-3 text-muted-foreground">Near {p.landmarks.join(", ")}</p>}
            </section>

            {hasRooms && (
              <section id="rooms" className="scroll-mt-32">
                <h2 className="text-2xl font-bold">{t("place.rooms")}</h2>
                <ul className="mt-4 divide-y rounded-xl border bg-card">
                  {p.room_types.map((r) => (
                    <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <p className="text-lg font-bold">{r.name}</p>
                        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="size-4" aria-hidden />{r.beds_per_room}</span>
                          <span className="flex items-center gap-1"><Snowflake className="size-4" aria-hidden />{r.ac ? t("place.ac") : t("place.nonAc")}</span>
                          <span className="flex items-center gap-1"><Bath className="size-4" aria-hidden />{r.attached_bath ? t("place.attachedBath") : t("place.sharedBath")}</span>
                          {r.deposit_paise > 0 && <span>{t("place.deposit")} {formatRupees(r.deposit_paise)}</span>}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-right">
                          <p className="font-display text-xl font-bold tabular-nums">{formatRupees(r.monthly_price_paise)}<span className="text-sm font-normal text-muted-foreground">{t("common.perMonth")}</span></p>
                          {r.beds_free != null && <p className={cn("text-sm font-semibold", r.beds_free > 0 ? "text-leaf" : "text-muted-foreground")}>{r.beds_free > 0 ? t("availability.free", { count: r.beds_free }) : t("availability.full")}</p>}
                        </div>
                        <Button asChild variant="outline" className="h-11"><Link to={`/p/${p.slug}/join?room=${r.id}`}>{t("place.requestThis")}</Link></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {p.amenities.length > 0 && (
              <section id="facilities" className="scroll-mt-32">
                <h2 className="mb-4 text-2xl font-bold">{t("place.facilities")}</h2>
                <AmenityList items={p.amenities} />
              </section>
            )}

            {hasFood && <FoodSection p={p} />}

            {(p.rules || Object.keys(p.rules_structured).length > 0) && (
              <section id="rules" className="scroll-mt-32">
                <h2 className="text-2xl font-bold">{t("place.rules")}</h2>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  {p.rules_structured.curfew && <Fact label={t("place.curfew")} value={p.rules_structured.curfew} />}
                  {p.rules_structured.visitors && <Fact label={t("place.visitors")} value={p.rules_structured.visitors} />}
                  {p.rules_structured.notice_days != null && p.rules_structured.notice_days > 0 && <Fact label={t("place.notice")} value={t("place.days", { count: p.rules_structured.notice_days })} />}
                </dl>
                {p.rules && <p className="mt-4 max-w-[65ch] whitespace-pre-line text-muted-foreground">{p.rules}</p>}
              </section>
            )}

            {p.lat != null && p.lng != null && (
              <section id="location" className="scroll-mt-32">
                <h2 className="text-2xl font-bold">{t("place.location")}</h2>
                <Suspense fallback={<Skeleton className="mt-4 h-72 rounded-xl" />}>
                  <PlaceMap className="mt-4 h-72 overflow-hidden rounded-xl border" zoom={15}
                    points={[{ name: p.name, lat: p.lat, lng: p.lng, approximate: p.address_public_level === "area_only" }]} />
                </Suspense>
                {p.address_public_level === "area_only"
                  ? <p className="mt-3 text-sm text-muted-foreground">{t("place.approxLocation")}</p>
                  : (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      {p.address && <p className="text-muted-foreground">{p.address}</p>}
                      <Button asChild variant="outline" className="h-11"><a href={googleMapsLink(p.lat, p.lng)} target="_blank" rel="noopener noreferrer">{t("place.openMaps")}</a></Button>
                    </div>
                  )}
              </section>
            )}
            <ReportDialog slug={p.slug} />
          </div>

          <aside className="hidden md:block">
            <div className="sticky top-32 space-y-4 rounded-2xl border bg-card p-5">
              <FromPrice paise={p.min_price_paise} className="block" />
              <AvailabilityBadge availability={p.availability} beds={p.beds_free} type={p.business_type} />
              <Button asChild size="lg" className="h-12 w-full"><Link to={`/p/${p.slug}/join`}>{t("common.requestToJoin")}</Link></Button>
              <ActionRow p={p} />
              {p.phone && <Button asChild variant="outline" className="h-11 w-full"><a href={`tel:${p.phone}`}><Phone className="size-4" />{formatPhone(p.phone)}</a></Button>}
            </div>
          </aside>
        </div>
      </div>

      {/* mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center gap-2 px-4 py-3">
          <Button asChild size="lg" className="h-12 flex-1"><Link to={`/p/${p.slug}/join`}>{t("common.requestToJoin")}</Link></Button>
          <ActionRow p={p} compact />
        </div>
      </div>
    </article>
  )
}

function Gallery({ p }: { p: PlaceDetail }) {
  const photos = p.photos
  if (photos.length === 0) return <div className="mt-4 aspect-[16/7] overflow-hidden rounded-2xl border"><PlaceCover type={p.business_type} /></div>
  return (
    <div className="mt-4 grid aspect-[16/7] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl">
      {photos.slice(0, 5).map((ph, i) => (
        <div key={ph.path} className={cn("overflow-hidden bg-muted", i === 0 ? "col-span-4 row-span-2 sm:col-span-2" : "hidden sm:block")}>
          <PlaceCover path={ph.path} type={p.business_type} alt={ph.alt ?? ""} />
        </div>
      ))}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-card p-3"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="font-semibold">{value}</dd></div>
}

function FoodSection({ p }: { p: PlaceDetail }) {
  const { t } = useTranslation()
  const today = weekday(tenantToday())
  const weekMeals = MEALS.filter((m) => p.menu_week.some((w) => w.meal === m))
  return (
    <section id="food" className="scroll-mt-32">
      <h2 className="text-2xl font-bold">{t("place.food")}</h2>
      {p.menu_today && p.menu_today.meals.length > 0 && (
        <div className="mt-4 rounded-xl border-2 border-turmeric/60 bg-turmeric-soft/40 p-4">
          <h3 className="font-bold">{t("place.todaysMenu")}</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            {p.menu_today.meals.map((m) => (
              <div key={m.meal}>
                <dt className="flex items-center gap-2 text-sm font-semibold">{t(`meals.${m.meal}`)}{p.meal_timings[m.meal] && <span className="font-normal text-muted-foreground">{p.meal_timings[m.meal]}</span>}{m.special && <Badge variant="secondary">{t("place.special")}</Badge>}</dt>
                <dd>{m.closed ? t("place.closed") : m.items.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {p.plans.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold">{t("place.plans")}</h3>
          <ul className="mt-2 divide-y rounded-xl border bg-card">
            {p.plans.map((pl) => (
              <li key={pl.id} className="flex items-center justify-between gap-4 p-4">
                <div><p className="font-semibold">{pl.name}</p>{pl.description && <p className="text-sm text-muted-foreground">{pl.description}</p>}</div>
                <p className="font-display text-lg font-bold tabular-nums">{formatRupees(pl.price_paise)}<span className="text-sm font-normal text-muted-foreground">{t("common.perMonth")}</span></p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {weekMeals.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold">{t("place.weeklyMenu")}</h3>
          <div className="mt-2 overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader><TableRow><TableHead className="w-14" />{weekMeals.map((m) => <TableHead key={m}>{t(`meals.${m}`)}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <TableRow key={d} className={cn(d === today && "bg-turmeric-soft/50 font-semibold")}>
                    <TableCell className="font-semibold">{DAYS[d]}</TableCell>
                    {weekMeals.map((m) => <TableCell key={m} className="min-w-40 whitespace-normal">{p.menu_week.find((w) => w.weekday === d && w.meal === m)?.items.join(", ") ?? "—"}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </section>
  )
}

function ActionRow({ p, compact }: { p: PlaceDetail; compact?: boolean }) {
  const { t } = useTranslation()
  const saved = savedPlaces.use().includes(p.slug)
  const share = async () => {
    const url = `${location.origin}/p/${p.slug}`
    try {
      if (navigator.share) await navigator.share({ title: p.name, text: p.headline ?? p.name, url })
      else { await navigator.clipboard.writeText(url); toast.success("Link copied") }
    } catch { /* user cancelled */ }
  }
  return (
    <div className={cn("flex gap-2", !compact && "w-full")}>
      <Button variant="outline" className={cn("h-12", compact ? "size-12" : "flex-1")} aria-pressed={saved} aria-label={saved ? t("common.saved") : t("common.save")} onClick={() => savedPlaces.toggle(p.slug)}>
        <Heart className={cn("size-5", saved && "fill-destructive text-destructive")} />{!compact && (saved ? t("common.saved") : t("common.save"))}
      </Button>
      <Button variant="outline" className={cn("h-12", compact ? "size-12" : "flex-1")} aria-label={t("common.share")} onClick={share}>
        <Share2 className="size-5" />{!compact && t("common.share")}
      </Button>
    </div>
  )
}

const REASONS = ["fake", "wrong_price", "wrong_availability", "unsafe", "scam", "privacy", "offensive", "other"] as const
const REASON_LABEL: Record<(typeof REASONS)[number], string> = {
  fake: "This place does not exist", wrong_price: "Prices are wrong", wrong_availability: "Seats shown are wrong", unsafe: "Unsafe place",
  scam: "Asked for money in a suspicious way", privacy: "Photos show people's faces", offensive: "Offensive content", other: "Something else",
}

function ReportDialog({ slug }: { slug: string }) {
  const { t } = useTranslation()
  const [reason, setReason] = useState<string>("")
  const [details, setDetails] = useState("")
  const [open, setOpen] = useState(false)
  const send = async () => {
    if (!isDemoData && supabase) {
      const { error } = await supabase.rpc("report_place", { p_slug: slug, p_reason: reason, p_details: details || null })
      if (error) return toast.error(error.message === "rate_limited" ? "Too many reports. Try again tomorrow." : t("common.somethingWrong"))
    }
    toast.success("Thank you. Our team will look at this listing.")
    setOpen(false)
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-11 text-muted-foreground"><Flag className="size-4" />{t("place.report")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("place.report")}</DialogTitle>
          <DialogDescription>Reports go to our moderation team. The owner does not see who reported.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason} className="gap-1">
          {REASONS.map((r) => (
            <Label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 font-normal"><RadioGroupItem value={r} />{REASON_LABEL[r]}</Label>
          ))}
        </RadioGroup>
        <Textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} placeholder="Anything else we should know (optional)" />
        <DialogFooter><Button className="h-11" disabled={!reason} onClick={send}>Send report</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
