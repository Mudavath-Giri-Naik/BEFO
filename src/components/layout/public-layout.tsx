import { Info } from "lucide-react"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"
import { Outlet, ScrollRestoration } from "react-router"
import { isDemoData } from "@/app/env"
import { Skeleton } from "@/components/ui/skeleton"
import { SiteFooter } from "./site-footer"
import { SiteHeader } from "./site-header"

export function DemoBanner() {
  const { t } = useTranslation()
  if (!isDemoData) return null
  return (
    <div className="border-b bg-accent text-accent-foreground">
      <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm"><Info className="size-4 shrink-0" aria-hidden />{t("common.demoData")}</p>
    </div>
  )
}

export function PageFallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-10" aria-busy>
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>
    </div>
  )
}

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Skip to content</a>
      <DemoBanner />
      <SiteHeader />
      <main id="main" className="flex-1">
        <Suspense fallback={<PageFallback />}><Outlet /></Suspense>
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  )
}
