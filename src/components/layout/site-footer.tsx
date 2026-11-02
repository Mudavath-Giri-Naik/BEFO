import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { brand } from "@/app/brand"
import { LogoMark } from "@/components/befo/logo"

export function SiteFooter() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  const links = [
    ["/about", "footer.about"], ["/help", "footer.help"], ["/terms", "footer.terms"], ["/privacy", "footer.privacy"], ["/help#report", "footer.report"],
  ] as const
  return (
    <footer className="border-t bg-card" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto]">
        <div className="flex items-start gap-3">
          <LogoMark className="size-9" />
          <div>
            <p className="font-display text-lg font-extrabold">{brand.name}</p>
            <p className="max-w-sm text-sm text-muted-foreground">Hostels, PGs and messes, listed by their owners.</p>
          </div>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
          {links.map(([to, k]) => <Link key={to} to={to} className="py-2 text-muted-foreground hover:text-foreground">{t(k)}</Link>)}
          {brand.supportEmail && <a href={`mailto:${brand.supportEmail}`} className="py-2 text-muted-foreground hover:text-foreground">{t("footer.contact")}</a>}
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted-foreground">© {year} {brand.name}</p>
    </footer>
  )
}
