import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "./session"

/** Protects every non-public route (§11.5). */
export function RequireVerifiedPhone({ children }: { children: ReactNode }) {
  const { ready, user, phoneVerified } = useAuth()
  const loc = useLocation()
  const next = encodeURIComponent(loc.pathname + loc.search)
  if (!ready) return <div className="mx-auto max-w-md p-8"><Skeleton className="h-40" /></div>
  if (!user) return <Navigate to={`/login?next=${next}`} replace />
  if (!phoneVerified) return <Navigate to={`/login/verify-phone?next=${next}`} replace />
  return <>{children}</>
}
