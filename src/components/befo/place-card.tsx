import { BadgeCheck, Heart, MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { PlaceCard as Card } from "@/lib/data/types"
import { comparePlaces, savedPlaces } from "@/lib/local-list"
import { cn } from "@/lib/utils"
import { AvailabilityBadge } from "./availability-badge"
import { AmenityIcon } from "./amenity"
import { PlaceCover } from "./place-cover"
import { FromPrice } from "./price"

export function typeLabel(t: (k: string) => string, c: Pick<Card, "business_type" | "audience">) {
  if (c.business_type === "hostel") return c.audience === "any" ? t("types.hostel") : `${t(`types.${c.audience}`)} ${t("types.hostel").toLowerCase()}`
  return t(`types.${c.business_type}`)
}

export function PlaceCard({ place, index = 0, compare = true, className }: { place: Card; index?: number; compare?: boolean; className?: string }) {
  const { t } = useTranslation()
  const saved = savedPlaces.use().includes(place.slug)
  const compared = comparePlaces.use()
  const inCompare = compared.includes(place.slug)
  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground transition-shadow hover:shadow-md focus-within:ring-[3px] focus-within:ring-ring/40", className)}>
      <div className="relative aspect-[16/10] overflow-hidden">
        <PlaceCover path={place.cover_path} type={place.business_type} seed={index} alt={place.name} />
        <div className="absolute top-2 left-2 flex gap-1.5">
          <Badge className="border-transparent bg-background/90 text-foreground backdrop-blur">{typeLabel(t, place)}</Badge>
        </div>
        <Button size="icon" variant="secondary" aria-pressed={saved} aria-label={saved ? t("common.saved") : t("common.save")}
          onClick={() => savedPlaces.toggle(place.slug)}
          className="absolute top-2 right-2 size-11 rounded-full bg-background/90 backdrop-blur hover:bg-background">
          <Heart className={cn("size-5", saved && "fill-destructive text-destructive")} />
        </Button>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg leading-snug font-bold">
            <Link to={`/p/${place.slug}`} className="outline-none after:absolute after:inset-0 after:content-['']">{place.name}</Link>
          </h3>
          {place.verified && (
            <Tooltip>
              <TooltipTrigger asChild>
                <BadgeCheck className="relative z-10 mt-1 size-5 shrink-0 text-primary" aria-label={t("common.verified")} />
              </TooltipTrigger>
              <TooltipContent>{t("place.verifiedExplain")}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{place.area}, {place.city}{place.distance_km != null ? ` · ${place.distance_km} km` : ""}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <AvailabilityBadge availability={place.availability} beds={place.beds_free} type={place.business_type} />
          {place.amenities.slice(0, 4).map((a) => <AmenityIcon key={a} name={a} className="text-muted-foreground" />)}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <FromPrice paise={place.min_price_paise} />
          {compare && (
            <label className="relative z-10 flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={inCompare} disabled={!inCompare && compared.length >= comparePlaces.max}
                onCheckedChange={() => comparePlaces.toggle(place.slug)} />
              {t("common.compare")}
            </label>
          )}
        </div>
      </div>
    </article>
  )
}
