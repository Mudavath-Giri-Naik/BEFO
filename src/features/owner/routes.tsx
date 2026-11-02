import { useQuery } from "@tanstack/react-query"
import { Hammer, Info } from "lucide-react"
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { usePageMeta } from "@/lib/meta"
import { demoOwnerApi, supabaseOwnerApi, type OwnerApi, type OwnerTenant } from "./api"
import { OwnerProvider } from "./context"
import InboxPage from "./inbox"
import MembersPage from "./members"
import { OwnerShell } from "./shell"
import TodayPage from "./today"

function Soon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="rounded-xl border border-dashed p-10">
      <Hammer className="size-8 text-primary" aria-hidden />
      <h1 className="mt-3 text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-muted-foreground">This screen arrives in {phase}. The database for it is ready.</p>
    </div>
  )
}

function OwnerPages() {
  return (
    <Routes>
      <Route element={<OwnerShellWithSwitcher />}>
        <Route index element={<TodayPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="rooms" element={<Soon title="Rooms" phase="Phase 3" />} />
        <Route path="menu" element={<Soon title="Menu" phase="Phase 3" />} />
        <Route path="money" element={<Soon title="Money" phase="Phases 8–9" />} />
        <Route path="more" element={<Soon title="Settings, notices, team and reports" phase="Phases 3–10" />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  )
}

/** Shell + place switcher (header select when the person runs more than one place). */
function OwnerShellWithSwitcher() {
  return <OwnerShell switcher={<PlaceSwitcher />} />
}
function PlaceSwitcher() {
  const nav = useNavigate()
  const { slug } = useParams()
  const ctx = useQuery({ queryKey: ["owner-places", isDemoPath()], queryFn: () => (isDemoPath() ? demoOwnerApi : supabaseOwnerApi).places() })
  if (!ctx.data || ctx.data.length < 2) return null
  const base = isDemoPath() ? "/demo" : "/app"
  return (
    <Select value={slug} onValueChange={(v) => nav(`${base}/${v}`)}>
      <SelectTrigger className="mt-2 h-10 w-full" aria-label="Switch place"><SelectValue /></SelectTrigger>
      <SelectContent>{ctx.data.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}</SelectContent>
    </Select>
  )
}
const isDemoPath = () => location.pathname.startsWith("/demo")

function PlaceLoader({ api, base }: { api: OwnerApi; base: string }) {
  const { slug } = useParams()
  const places = useQuery({ queryKey: ["owner-places", api.readOnly], queryFn: () => api.places() })
  if (places.isLoading) return <div className="mx-auto max-w-6xl p-4"><Skeleton className="h-64" /></div>
  const tenant: OwnerTenant | undefined = places.data?.find((p) => p.slug === slug)
  if (!tenant) return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">You don't manage this place</h1>
      <p className="mt-2 text-muted-foreground">Ask the owner to add your mobile number as a manager.</p>
      <Button asChild className="mt-6 h-11"><Link to={base}>Your places</Link></Button>
    </div>
  )
  return <OwnerProvider api={api} tenant={tenant} base={`${base}/${tenant.slug}`}><OwnerPages /></OwnerProvider>
}

/** /app — pick a place (or go straight in when there is one). */
export function AppIndex() {
  const places = useQuery({ queryKey: ["owner-places", false], queryFn: () => supabaseOwnerApi.places() })
  usePageMeta({ title: "Your places" })
  if (places.isLoading) return <div className="mx-auto max-w-xl p-6"><Skeleton className="h-40" /></div>
  if (places.data?.length === 1) return <Navigate to={`/app/${places.data[0].slug}`} replace />
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-bold">Your places</h1>
      {places.data?.length ? (
        <ul className="mt-6 space-y-2">{places.data.map((p) => (
          <li key={p.slug}><Link to={`/app/${p.slug}`} className="flex min-h-14 items-center justify-between rounded-xl border bg-card px-4 font-semibold hover:border-primary">{p.name}<span className="text-sm font-normal text-muted-foreground">{p.role}</span></Link></li>))}</ul>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed p-8 text-center">
          <p>You don't run a place here yet.</p>
          <Button asChild className="mt-4 h-11"><Link to="/list-your-place">List your place free</Link></Button>
        </div>
      )}
    </div>
  )
}

export function AppPlace() {
  return <PlaceLoader api={supabaseOwnerApi} base="/app" />
}

/** /demo — the owner app on example data, read-only (§9.6). */
export function DemoOwner() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <Alert><Info className="size-4" /><AlertDescription>Demo data. Try anything — nothing is saved.</AlertDescription></Alert>
      </div>
      <PlaceLoader api={demoOwnerApi} base="/demo" />
    </>
  )
}
export function DemoIndex() {
  return <Navigate to="/demo/demo-mess" replace />
}
