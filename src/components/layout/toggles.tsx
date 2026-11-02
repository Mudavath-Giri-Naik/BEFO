import { Languages, Monitor, Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTheme, type Theme } from "@/app/theme"

export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, resolved, setTheme } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11" aria-label={t("common.theme")}>
          {resolved === "dark" ? <Moon className="size-5" /> : <Sun className="size-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
          <DropdownMenuRadioItem value="light"><Sun className="size-4" />{t("common.light")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon className="size-4" />{t("common.dark")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><Monitor className="size-4" />{t("common.system")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const next = i18n.resolvedLanguage === "te" ? "en" : "te"
  return (
    <Button variant="ghost" className="h-11 gap-1.5 px-3" onClick={() => i18n.changeLanguage(next)} aria-label={t("common.language")}>
      <Languages className="size-5" aria-hidden />
      <span className="text-sm font-semibold">{next === "te" ? "తెలుగు" : "English"}</span>
    </Button>
  )
}
