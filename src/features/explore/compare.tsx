import { BadgeCheck, Check, Minus } from "lucide-react"
import { useQueries } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, useSearchParams } from "react-router"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AMENITIES } from "@/components/befo/amenity"
import { AvailabilityBadge } from "@/components/befo/availability-badge"
import { typeLabel } from "@/components/befo/place-card"
import { publicApi } from "@/lib/data"
import { formatRupees } from "@/lib/money"
import { usePageMeta } from "@/lib/meta"

export default function ComparePage() {
  const { t } = useTranslation()
  const [sp] = useSearchParams()
  const ids = (sp.get("ids") ?? "").split(",").filter(Boolean).slice(0, 3)
  usePageMeta({ title: t("common.compare") })
  const qs = useQueries({ queries: ids.map((slug) => ({ queryKey: ["place", slug], queryFn: () => publicApi.detail(slug) })) })
  const places = qs.map((q) => q.data).filter((x): x is NonNullable<typeof x> => !!x)
  if (qs.some((q) => q.isLoading)) return <div className="mx-auto max-w-5xl px-4 py-8"><Skeleton className="h-96 rounded-xl" /></div>
  if (places.length < 2) return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Pick two or three places to compare</h1>
      <p className="mt-2 text-muted-foreground">Tick “Compare” on the place cards.</p>
      <Button asChild className="mt-6 h-11"><Link to="/explore">{t("nav.explore")}</Link></Button>
    </div>
  )
  const amen = Object.keys(AMENITIES).filter((a) => places.some((p) => p.amenities.includes(a)))
  const row = (label: string, cell: (p: (typeof places)[number]) => React.ReactNode) => (
    <TableRow><TableHead scope="row" className="sticky left-0 z-10 min-w-32 bg-card font-semibold">{label}</TableHead>{places.map((p) => <TableCell key={p.slug} className="min-w-48 align-top whitespace-normal">{cell(p)}</TableCell>)}</TableRow>
  )
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold">{t("common.compare")}</h1>
      <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow><TableHead className="sticky left-0 z-10 bg-card" />{places.map((p) => (
              <TableHead key={p.slug} className="h-auto py-3 align-top whitespace-normal">
                <Link to={`/p/${p.slug}`} className="text-base font-bold text-foreground hover:underline">{p.name}</Link>
                <p className="font-normal text-muted-foreground">{typeLabel(t, p)} · {p.area}</p>
              </TableHead>))}</TableRow>
          </TableHeader>
          <TableBody>
            {row("Price", (p) => p.min_price_paise != null ? `${t("common.from")} ${formatRupees(p.min_price_paise)}${t("common.perMonth")}` : "—")}
            {row("Seats", (p) => <AvailabilityBadge availability={p.availability} beds={p.beds_free} type={p.business_type} />)}
            {row(t("place.rooms"), (p) => p.room_types.length ? p.room_types.map((r) => `${r.name} ${formatRupees(r.monthly_price_paise)}`).join(", ") : "—")}
            {row(t("explore.food"), (p) => p.food_info.veg_type ? (p.food_info.veg_type === "veg" ? t("explore.veg") : t("explore.nonveg")) : "—")}
            {row(t("place.curfew"), (p) => p.rules_structured.curfew ?? "—")}
            {row(t("common.verified"), (p) => p.verified ? <BadgeCheck className="size-5 text-primary" aria-label="Yes" /> : <Minus className="size-5 text-muted-foreground" aria-label="No" />)}
            {amen.map((a) => row(t(`amenity.${a}`), (p) => p.amenities.includes(a) ? <Check className="size-5 text-leaf" aria-label="Yes" /> : <Minus className="size-5 text-muted-foreground" aria-label="No" />))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
