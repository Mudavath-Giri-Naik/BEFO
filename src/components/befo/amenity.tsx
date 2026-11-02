import { AirVent, Car, Cctv, Droplets, Flame, Shirt, Sparkles, ArrowUpDown, Wifi, Zap, type LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export const AMENITIES: Record<string, LucideIcon> = {
  wifi: Wifi, ac: AirVent, geyser: Flame, laundry: Shirt, cctv: Cctv, power_backup: Zap, parking: Car, ro_water: Droplets, lift: ArrowUpDown, housekeeping: Sparkles,
}

export function AmenityIcon({ name, className }: { name: string; className?: string }) {
  const { t } = useTranslation()
  const Icon = AMENITIES[name]
  if (!Icon) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("relative z-10 inline-flex", className)} role="img" aria-label={t(`amenity.${name}`)}><Icon className="size-4" /></span>
      </TooltipTrigger>
      <TooltipContent>{t(`amenity.${name}`)}</TooltipContent>
    </Tooltip>
  )
}

export function AmenityList({ items }: { items: string[] }) {
  const { t } = useTranslation()
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {items.map((a) => {
        const Icon = AMENITIES[a]
        return (
          <li key={a} className="flex items-center gap-2">
            {Icon && <Icon className="size-5 text-primary" aria-hidden />}
            <span>{t(`amenity.${a}`, a)}</span>
          </li>
        )
      })}
    </ul>
  )
}
