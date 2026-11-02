import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import type { Availability, BusinessType } from "@/lib/data/types"
import { cn } from "@/lib/utils"

export function AvailabilityBadge({ availability, beds, type, className }: { availability: Availability; beds: number | null; type: BusinessType; className?: string }) {
  const { t } = useTranslation()
  if (availability === "none") return null
  const seats = type === "mess" || type === "tiffin"
  if (availability === "free" && beds != null) {
    return (
      <Badge className={cn("gap-1.5 border-transparent bg-leaf-soft text-leaf", className)}>
        <span className="size-2 rounded-full bg-leaf" aria-hidden />
        {t(seats ? "availability.seats" : "availability.free", { count: beds })}
      </Badge>
    )
  }
  if (availability === "full") return <Badge variant="secondary" className={className}>{t("availability.full")}</Badge>
  return <Badge variant="outline" className={cn("text-muted-foreground", className)}>{t("availability.ask")}</Badge>
}
