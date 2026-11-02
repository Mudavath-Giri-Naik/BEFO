import { Menu } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, NavLink } from "react-router"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Logo } from "@/components/befo/logo"
import { cn } from "@/lib/utils"
import { LanguageToggle, ThemeToggle } from "./toggles"

const LINKS = [
  { to: "/explore", key: "nav.explore" },
  { to: "/hostels", key: "nav.hostels" },
  { to: "/messes", key: "nav.mess" },
] as const

export function SiteHeader() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn("rounded-md px-3 py-2 text-sm font-semibold outline-none hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50", isActive ? "text-foreground" : "text-muted-foreground")
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Logo />
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => <NavLink key={l.to} to={l.to} className={linkCls}>{t(l.key)}</NavLink>)}
          <NavLink to="/for-owners" className={linkCls}>{t("nav.forOwners")}</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <div className="hidden sm:flex"><LanguageToggle /></div>
          <ThemeToggle />
          <Button asChild className="ml-1 hidden h-11 px-5 sm:inline-flex"><Link to="/login">{t("nav.login")}</Link></Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11 md:hidden" aria-label={t("nav.menu")}><Menu className="size-6" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm">
              <SheetHeader><SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle><Logo /></SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Main" onClick={() => setOpen(false)}>
                {LINKS.map((l) => <NavLink key={l.to} to={l.to} className={(s) => cn(linkCls(s), "py-3 text-base")}>{t(l.key)}</NavLink>)}
                <NavLink to="/for-owners" className={(s) => cn(linkCls(s), "py-3 text-base")}>{t("nav.forOwners")}</NavLink>
                <Separator className="my-2" />
                <Button asChild size="lg" className="h-12"><Link to="/login">{t("nav.login")}</Link></Button>
              </nav>
              <div className="mt-auto flex items-center justify-between border-t p-4"><LanguageToggle /><ThemeToggle /></div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
