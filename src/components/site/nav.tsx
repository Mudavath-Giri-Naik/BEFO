import { ArrowUpRight, Search } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router"
import { Logo } from "@/components/befo/logo"
import { LanguageToggle, ThemeToggle } from "@/components/layout/toggles"
import { cn } from "@/lib/utils"
import { photo } from "./media"
import { EASE } from "./reveal"

const ITEMS = [
  { to: "/explore", title: "Explore", sub: "Find a place near you" },
  { to: "/hostels", title: "Hostels & PGs", sub: "Rooms with live beds" },
  { to: "/messes", title: "Mess & food", sub: "Today's menus" },
  { to: "/compare", title: "Compare", sub: "Up to three, side by side" },
  { to: "/for-owners", title: "For owners", sub: "Run your place" },
  { to: "/help", title: "Help", sub: "Questions answered" },
]

/** Floating pill logo + round icon buttons; the menu opens as a card under them. */
export function SiteNav() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const reduce = useReducedMotion()
  const panel = useRef<HTMLDivElement>(null)
  const [prevPath, setPrevPath] = useState(loc.pathname)
  if (prevPath !== loc.pathname) { setPrevPath(loc.pathname); setOpen(false) }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    const onDown = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest("[data-site-nav]")) setOpen(false) }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointerdown", onDown)
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown) }
  }, [open])
  const circle = "flex size-14 items-center justify-center rounded-full border border-foreground/12 bg-background/70 backdrop-blur-md transition-colors duration-300 outline-none hover:bg-card focus-visible:ring-[3px] focus-visible:ring-ring/50"
  return (
    <header data-site-nav className="fixed inset-x-0 top-0 z-50" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
      <div className="relative mx-auto flex max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <div className="flex h-14 items-center rounded-full border border-foreground/12 bg-background/70 px-6 backdrop-blur-md"><Logo /></div>
        <div className="flex items-center gap-2.5">
          <Link to="/explore" className={circle} aria-label={t("nav.explore")}><Search className="size-[20px]" strokeWidth={1.6} /></Link>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="site-menu" aria-label={t("nav.menu")}
            className={cn(circle, open && "border-brand bg-brand text-white hover:bg-brand")}>
            <span className="relative block h-3.5 w-5" aria-hidden>
              <span className={cn("absolute left-0 h-[1.6px] w-5 rounded bg-current transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]", open ? "top-1/2 rotate-45" : "top-0")} />
              <span className={cn("absolute top-1/2 left-0 h-[1.6px] w-5 -translate-y-1/2 rounded bg-current transition-opacity duration-300", open && "opacity-0")} />
              <span className={cn("absolute left-0 h-[1.6px] w-5 rounded bg-current transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]", open ? "top-1/2 -rotate-45" : "top-full -translate-y-full")} />
            </span>
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div id="site-menu" ref={panel} role="dialog" aria-label={t("nav.menu")}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.97, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98, filter: "blur(4px)" }}
              transition={{ duration: 0.45, ease: EASE }}
              className="absolute top-[calc(100%+12px)] right-4 left-4 origin-top-right rounded-[32px] border border-foreground/10 bg-popover/95 p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:left-auto sm:w-[540px] sm:right-6">
              <ul className="grid grid-cols-2">
                {ITEMS.map((it, i) => (
                  <li key={it.to} className={cn("border-foreground/10", i % 2 === 0 && "border-r", i < 4 && "border-b")}>
                    <Link to={it.to} className="block rounded-2xl px-4 py-4 transition-colors hover:bg-muted/70">
                      <span className="block text-[19px] font-medium">{it.title}</span>
                      <span className="block text-[15px] text-muted-foreground">{it.sub}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to="/explore" className="group relative mt-4 block h-36 overflow-hidden rounded-[22px]">
                <img src={photo("chaise", 900, 360)} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                <span className="absolute inset-0 bg-black/35" />
                <span className="relative flex h-full items-center justify-center gap-2 text-[26px] font-medium text-white">Find a place <ArrowUpRight className="size-7 transition-transform duration-500 group-hover:rotate-45" strokeWidth={1.5} /></span>
              </Link>
              <div className="mt-3 flex items-center justify-between gap-2 px-1">
                <Link to="/login" className="inline-flex h-11 items-center rounded-full px-4 text-[15px] font-medium hover:bg-muted">{t("nav.login")}</Link>
                <div className="flex items-center"><LanguageToggle /><ThemeToggle /></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

