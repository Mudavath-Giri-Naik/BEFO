import { ArrowRight, BadgeCheck, ChefHat, IndianRupee, LocateFixed, UserRoundX } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { PlaceCard } from "@/components/befo/place-card"
import { RoomBoard, type BoardRoom } from "@/components/befo/room-board"
import { SearchBox } from "@/features/explore/search-box"
import { DEMO_AREAS } from "@/lib/data/demo"
import { useMenusToday, usePlaces, useStats } from "@/lib/data"
import type { MenuMeal } from "@/lib/data/types"
import { usePageMeta } from "@/lib/meta"

const HERO_BOARD: BoardRoom[] = [
  { label: "G1", beds: ["taken", "taken"] }, { label: "G2", beds: ["taken", "free", "taken"] }, { label: "G3", beds: ["taken", "taken", "taken"] },
  { label: "G4", beds: ["free", "taken"] }, { label: "F1", beds: ["taken", "taken", "free"] }, { label: "F2", beds: ["taken", "blocked"] },
  { label: "F3", beds: ["taken", "taken", "taken"] }, { label: "F4", beds: ["free", "free"] },
]

const CHIPS = [
  { key: "home.chips.boys", to: "/explore?type=hostel&audience=boys" },
  { key: "home.chips.girls", to: "/explore?type=hostel&audience=girls" },
  { key: "home.chips.veg", to: "/explore?type=mess&veg=veg" },
  { key: "home.chips.under5k", to: "/explore?max=5000" },
  { key: "home.chips.ac", to: "/explore?amenities=ac" },
] as const

export default function HomePage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  usePageMeta({ title: t("home.title") })
  const stats = useStats()
  const featured = usePlaces({ onlyAvailable: true, sort: "beds_free", limit: 6 })
  const messSlugs = featured.data?.items.filter((p) => p.business_type !== "hostel").map((p) => p.slug) ?? []
  const menus = useMenusToday(messSlugs)

  const nearMe = () => {
    if (!("geolocation" in navigator)) return toast.error("Location is not available on this device.")
    navigator.geolocation.getCurrentPosition(
      (pos) => nav(`/explore?lat=${pos.coords.latitude.toFixed(4)}&lng=${pos.coords.longitude.toFixed(4)}&sort=nearest`),
      () => toast.error("Allow location access to see places near you."),
      { maximumAge: 600_000, timeout: 10_000 })
  }

  return (
    <>
      {/* 1. Hero */}
      <section className="border-b bg-ink-soft/50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 pb-12 md:grid-cols-[1.15fr_1fr] md:items-center md:pt-16 md:pb-20">
          <div>
            <h1 className="max-w-[18ch] text-[2.1rem] leading-[1.08] font-extrabold text-balance sm:text-5xl lg:text-[3.4rem]">{t("home.title")}</h1>
            <p className="mt-4 max-w-[52ch] text-lg text-muted-foreground">{t("home.subtitle")}</p>
            <SearchBox className="mt-7" />
            <div className="mt-4 flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <Button key={c.key} asChild variant="outline" className="h-10 rounded-full bg-card px-4"><Link to={c.to}>{t(c.key)}</Link></Button>
              ))}
              <Button variant="outline" className="h-10 rounded-full bg-card px-4" onClick={nearMe}><LocateFixed className="size-4" />{t("home.chips.near")}</Button>
            </div>
          </div>
          <figure className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
            <figcaption className="mb-3 flex items-baseline justify-between gap-3">
              <span className="font-display font-bold">Sai Krishna Boys Hostel</span>
              <span className="text-xs text-muted-foreground">Chintalavalasa</span>
            </figcaption>
            <RoomBoard rooms={HERO_BOARD} animate />
            <div className="mt-4 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-semibold text-leaf"><span className="size-2.5 rounded-full bg-leaf" aria-hidden />{t("availability.free", { count: 5 })}</span>
              <span className="text-muted-foreground">{t("common.updatedAgo", { ago: "20 min ago" })}</span>
            </div>
          </figure>
        </div>
      </section>

      {/* 2. Live strip */}
      <section aria-live="polite" className="border-b bg-card">
        <div className="mx-auto flex min-h-14 max-w-6xl items-center px-4 text-sm">
          {stats.data && stats.data.places >= 3 ? (
            <p className="flex items-center gap-2"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-leaf opacity-60 motion-reduce:hidden" /><span className="relative inline-flex size-2.5 rounded-full bg-leaf" /></span>
              <span className="font-semibold">{t("home.live", { places: stats.data.places, beds: stats.data.beds_free })}</span></p>
          ) : <Skeleton className="h-4 w-56" />}
        </div>
      </section>

      {/* 3. Featured */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("home.featured")}</h2>
          <Link to="/explore?free=1" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-primary">{t("common.seeAll")}<ArrowRight className="size-4" /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.isLoading ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-80 rounded-xl" />)
            : featured.data?.items.map((p, i) => <PlaceCard key={p.slug} place={p} index={i} />)}
        </div>
      </section>

      {/* 4. Today's menus */}
      {menus.data && menus.data.length > 0 && (
        <section className="border-y bg-turmeric-soft/50 py-12">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-5 text-2xl font-bold sm:text-3xl">{t("home.menusToday")}</h2>
          </div>
          <ScrollArea className="mx-auto max-w-6xl">
            <ul className="flex gap-4 px-4 pb-4">
              {menus.data.map((m) => <MenuTicket key={m.slug} {...m} />)}
            </ul>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}

      {/* 5. Why it's different */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold sm:text-3xl">{t("home.why")}</h2>
        <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {([[BadgeCheck, "why1"], [ChefHat, "why2"], [IndianRupee, "why3"], [UserRoundX, "why4"]] as const).map(([Icon, k]) => (
            <div key={k} className="flex gap-4">
              <Icon className="mt-1 size-7 shrink-0 text-primary" aria-hidden />
              <div><dt className="text-lg font-bold">{t(`home.${k}t`)}</dt><dd className="mt-1 text-muted-foreground">{t(`home.${k}`)}</dd></div>
            </div>
          ))}
        </dl>
      </section>

      {/* 6. How it works — a real sequence, so it is numbered */}
      <section className="border-y bg-card py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("home.how")}</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {(["how1", "how2", "how3"] as const).map((k, i) => (
              <li key={k} className="relative border-l-4 border-primary/25 pl-5">
                <span className="font-display text-4xl font-extrabold text-primary/30 tabular-nums" aria-hidden>{i + 1}</span>
                <h3 className="mt-1 text-lg font-bold">{t(`home.${k}t`)}</h3>
                <p className="mt-1 text-muted-foreground">{t(`home.${k}`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 7. Popular areas */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold sm:text-3xl">{t("home.areas")}</h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {DEMO_AREAS.map((a) => (
            <li key={a.label}>
              <Link to={`/explore?q=${encodeURIComponent(a.label)}`} className="flex min-h-20 flex-col justify-center rounded-xl border bg-card px-4 py-3 outline-none hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <span className="font-bold">{a.label}</span>
                <span className="text-sm text-muted-foreground">{a.city} · {a.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 8. Owner strip */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[60ch] text-lg font-semibold">{t("home.ownerStrip")}</p>
          <Button asChild size="lg" variant="secondary" className="h-12 shrink-0"><Link to="/for-owners">{t("home.ownerCta")}<ArrowRight className="size-4" /></Link></Button>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="text-2xl font-bold sm:text-3xl">{t("home.faq")}</h2>
        <Accordion type="single" collapsible className="mt-4">
          {(["1", "2", "3", "4"] as const).map((n) => (
            <AccordionItem key={n} value={n}>
              <AccordionTrigger className="text-base">{t(`home.q${n}`)}</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">{t(`home.a${n}`)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  )
}

function MenuTicket({ slug, name, area, menu }: { slug: string; name: string; area: string; menu: { meals: MenuMeal[] } }) {
  const { t } = useTranslation()
  return (
    <li className="w-72 shrink-0">
      <Link to={`/p/${slug}#food`} className="block h-full rounded-xl border bg-card p-4 outline-none hover:border-turmeric focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <p className="font-bold">{name}</p>
        <p className="text-sm text-muted-foreground">{area}</p>
        <dl className="mt-3 space-y-2 text-sm">
          {menu.meals.map((m) => (
            <div key={m.meal}>
              <dt className="font-semibold">{t(`meals.${m.meal}`)}</dt>
              <dd className="text-muted-foreground">{m.closed ? t("place.closed") : m.items.join(", ")}</dd>
            </div>
          ))}
        </dl>
      </Link>
    </li>
  )
}
