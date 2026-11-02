import { useTranslation } from "react-i18next"
import { formatRupees } from "@/lib/money"
import { cn } from "@/lib/utils"

export function FromPrice({ paise, className }: { paise: number | null; className?: string }) {
  const { t } = useTranslation()
  if (paise == null) return null
  return (
    <span className={cn("whitespace-nowrap", className)}>
      <span className="text-xs text-muted-foreground">{t("common.from")} </span>
      <span className="text-xl font-extrabold tracking-tight tabular-nums">{formatRupees(paise)}</span>
      <span className="text-xs text-muted-foreground">{t("common.perMonth")}</span>
    </span>
  )
}
