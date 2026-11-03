import { Info } from "lucide-react"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"
import { Outlet, useLocation } from "react-router"
import { isDemoData } from "@/app/env"
import { Skeleton } from "@/components/ui/skeleton"
import { SiteFooter } from "@/components/site/footer"
import { SiteNav } from "@/components/site/nav"
import { SmoothScroll } from "@/components/site/smooth-scroll"
import { cn } from "@/lib/utils"

export function DemoBanner() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  // only on browsing pages; place pages have their own bottom bar and /demo has its own note
  if (!isDemoData || !["/", "/explore", "/hostels", "/messes", "/compare"].includes(pathname)) return null
  return (
    <div data-demo-banner className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
      <p className="pointer-events-auto flex items-center gap-2 rounded-full border border-foreground/10 bg-popover/95 px-4 py-2 text-[13px] shadow-lg backdrop-blur"><Info className="size-4 shrink-0" aria-hidden />{t("common.demoData")}</p>
    </div>
  )
}

export function PageFallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-10" aria-busy>
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-[28px]" />)}</div>
    </div>
  )
}

export function PublicLayout() {
  const { pathname } = useLocation()
  const home = pathname === "/"
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Skip to content</a>
      <SmoothScroll />
      <SiteNav />
      <main id="main" className={cn("flex-1", !home && "pt-[96px] pb-16")}>
        <Suspense fallback={<PageFallback />}><Outlet /></Suspense>
      </main>
      {/* the big footer belongs to the home page only; inner pages end with their own content */}
      {home && <SiteFooter />}
      <DemoBanner />
    </div>
  )
}
