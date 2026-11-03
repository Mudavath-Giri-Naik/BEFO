import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowUpRight, BadgeCheck, Building2, Check, ClipboardCheck, Flag, Inbox, LayoutDashboard, Mail, MoreVertical, Phone, Search, ShieldCheck, Users, X,
} from "lucide-react"
import { useState } from "react"
import { Link, Navigate, NavLink, Outlet, Route, Routes, useSearchParams } from "react-router"
import { toast } from "sonner"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/session"
import { timeAgo } from "@/lib/dates"
import { usePageMeta } from "@/lib/meta"
import { formatRupees } from "@/lib/money"
import { cn } from "@/lib/utils"
import { adminApi, type AdminApplication, type AdminPlace, type AdminReport } from "./api"

const TYPE_LABEL: Record<string, string> = { mess: "Mess", hostel: "Hostel / PG", tiffin: "Tiffin", other: "Other" }
const AUDIENCE_LABEL: Record<string, string> = { boys: "Boys", girls: "Girls", coed: "Co-living", any: "Anyone" }

/** /admin — platform admin console. Guarded: only platform admins get past the context check. */
export default function AdminRoutes() {
  const { context, contextSettled } = useAuth()
  if (!contextSettled) return <div className="mx-auto max-w-xl p-6"><Skeleton className="h-40 rounded-xl" /></div>
  if (!context?.is_platform_admin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldCheck className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Admins only</h1>
        <p className="mt-2 text-muted-foreground">This area is for the platform team.</p>
        <Button asChild className="mt-6 h-11 rounded-full"><Link to="/me">Go to your home</Link></Button>
      </div>
    )
  }
  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="places" element={<PlacesPage />} />
        <Route path="listings" element={<Navigate to="../places?filter=pending" replace />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  )
}

// ───────────────────────── shell ─────────────────────────

function useOverview() {
  return useQuery({ queryKey: ["admin", "overview"], queryFn: adminApi.overview, refetchInterval: 60_000 })
}

function AdminShell() {
  const ov = useOverview()
  const { context } = useAuth()
  const nav = [
    { to: "/admin", end: true, label: "Overview", icon: LayoutDashboard },
    { to: "/admin/applications", label: "Applications", icon: Inbox, count: ov.data?.applications_pending },
    { to: "/admin/places", label: "Places", icon: Building2, count: ov.data?.listings_pending },
    { to: "/admin/reports", label: "Reports", icon: Flag, count: ov.data?.reports_open },
  ]
  const link = ({ isActive }: { isActive: boolean }) =>
    cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold", isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")
  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 pt-4 pb-28 md:pb-10">
      <aside className="hidden w-56 shrink-0 md:block" aria-label="Admin menu">
        <div className="sticky top-20 space-y-4">
          <div>
            <p className="text-[13px] text-muted-foreground">Platform admin</p>
            <div className="mt-1 text-[20px] leading-tight tracking-[-0.02em]">Control room</div>
          </div>
          <nav className="space-y-1">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={link}>
                <n.icon className="size-5" aria-hidden />{n.label}
                {!!n.count && <Badge variant="secondary" className="ml-auto">{n.count}</Badge>}
              </NavLink>
            ))}
          </nav>
          {!!context?.staff.length && (
            <div className="border-t pt-4">
              <p className="px-3 text-[13px] text-muted-foreground">Your places</p>
              {context.staff.map((s) => (
                <Link key={s.slug} to={`/app/${s.slug}`} className="flex min-h-11 items-center justify-between rounded-lg px-3 text-sm hover:bg-muted">
                  <span className="truncate">{s.name}</span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mb-5 md:hidden">
          <p className="text-[13px] text-muted-foreground">Platform admin</p>
          <div className="mt-1 text-[24px] leading-tight tracking-[-0.03em]">Control room</div>
        </div>
        <Outlet />
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Admin menu">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => cn("relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>
            <n.icon className="size-6" aria-hidden />{n.label}
            {!!n.count && <span className="absolute top-2 right-[calc(50%-22px)] rounded-full bg-destructive px-1.5 text-[10px] text-white">{n.count}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

// ───────────────────────── shared bits ─────────────────────────

type Tone = "warn" | "good" | "bad" | "muted"
function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const cls = { warn: "bg-turmeric-soft text-foreground", good: "bg-leaf-soft text-leaf", bad: "bg-destructive/10 text-destructive", muted: "bg-muted text-muted-foreground" }[tone]
  return <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold whitespace-nowrap", cls)}>{children}</span>
}

function Chips<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string, number?][] }) {
  return (
    <div role="radiogroup" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {options.map(([v, label, n]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={cn("inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium", value === v ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
          {label}{n != null && <span className="tabular-nums opacity-70">{n}</span>}
        </button>
      ))}
    </div>
  )
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 text-muted-foreground">{body}</p>
    </div>
  )
}

function ListSkeleton() {
  return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
}

function Contact({ name, email, phone }: { name?: string | null; email?: string | null; phone?: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {name && <span className="inline-flex items-center gap-1.5 text-foreground"><Users className="size-4" aria-hidden />{name}</span>}
      {email && <a href={`mailto:${email}`} className="inline-flex min-h-11 items-center gap-1.5 break-all hover:text-foreground"><Mail className="size-4 shrink-0" aria-hidden />{email}</a>}
      {phone && <a href={`tel:${phone}`} className="inline-flex min-h-11 items-center gap-1.5 hover:text-foreground"><Phone className="size-4" aria-hidden />{phone}</a>}
    </div>
  )
}

/** Asks for a reason the owner will read. Used for every "no". */
function ReasonDialog({ open, onOpenChange, title, description, cta, busy, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; cta: string; busy?: boolean; onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState("")
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setReason("") }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason (the owner sees this)</Label>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} placeholder="e.g. Please add the exact area and a phone we can reach." />
        </div>
        <DialogFooter>
          <Button variant="destructive" className="h-11" disabled={busy || !reason.trim()} onClick={() => onConfirm(reason.trim())}>{cta}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function useAdminMutation<A>(fn: (a: A) => Promise<unknown>, success: (a: A) => string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, a) => { toast.success(success(a)); qc.invalidateQueries({ queryKey: ["admin"] }) },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong. Try again."),
  })
}

// ───────────────────────── overview ─────────────────────────

function OverviewPage() {
  usePageMeta({ title: "Admin" })
  const ov = useOverview()
  const apps = useQuery({ queryKey: ["admin", "applications", "pending"], queryFn: () => adminApi.applications("pending") })
  const d = ov.data
  const stats: { label: string; value?: number; sub?: string; to?: string; tone?: Tone }[] = [
    { label: "Applications waiting", value: d?.applications_pending, to: "/admin/applications", tone: d?.applications_pending ? "warn" : undefined },
    { label: "Listings to review", value: d?.listings_pending, to: "/admin/places?filter=pending", tone: d?.listings_pending ? "warn" : undefined },
    { label: "Open reports", value: d?.reports_open, to: "/admin/reports", tone: d?.reports_open ? "bad" : undefined },
    { label: "Places running", value: d?.places_running, sub: d ? `${d.places} total · ${d.places_suspended} suspended` : undefined, to: "/admin/places" },
    { label: "Live listings", value: d?.listings_live, to: "/admin/places?filter=live" },
    { label: "People signed up", value: d?.users, sub: d ? `${d.users_7d} this week` : undefined },
    { label: "Members across places", value: d?.members },
    { label: "Join requests waiting", value: d?.join_requests_pending, sub: "Owners decide these" },
  ]
  if (ov.isError) return <Empty title="Couldn't load the dashboard" body={(ov.error as Error).message} />
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-muted-foreground">Everything that needs a decision is at the top. Nothing here needs daily work.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const body = (
            <>
              <p className="text-[13px] leading-tight text-muted-foreground">{s.label}</p>
              {s.value == null ? <Skeleton className="mt-2 h-8 w-12" /> : <p className="mt-1 text-[28px] leading-none font-semibold tabular-nums">{s.value}</p>}
              {s.sub && <p className="mt-1.5 text-[12px] text-muted-foreground">{s.sub}</p>}
            </>
          )
          const cls = cn("block min-h-28 rounded-xl border bg-card p-4", s.tone === "warn" && "border-turmeric", s.tone === "bad" && "border-destructive/50", s.to && "transition-colors hover:border-primary")
          return s.to ? <Link key={s.label} to={s.to} className={cls}>{body}</Link> : <div key={s.label} className={cls}>{body}</div>
        })}
      </div>
      {d && Object.keys(d.by_type).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(d.by_type).map(([k, n]) => <Pill key={k} tone="muted">{TYPE_LABEL[k] ?? k} · {n}</Pill>)}
        </div>
      )}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold">Waiting for approval</h2>
          <Link to="/admin/applications" className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground hover:text-foreground">See all</Link>
        </div>
        {apps.isLoading ? <ListSkeleton /> : apps.data?.length ? (
          <div className="space-y-3">{apps.data.slice(0, 3).map((a) => <ApplicationCard key={a.id} a={a} />)}</div>
        ) : <Empty title="No applications waiting" body="New owners who apply show up here. You'll also get a notification." />}
      </section>
    </div>
  )
}

// ───────────────────────── applications ─────────────────────────

function ApplicationsPage() {
  usePageMeta({ title: "Applications · Admin" })
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending")
  const q = useQuery({ queryKey: ["admin", "applications", "all"], queryFn: () => adminApi.applications() })
  const all = q.data ?? []
  const count = (s: string) => all.filter((a) => a.status === s).length
  const list = filter === "all" ? all : all.filter((a) => a.status === filter)
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
        <p className="mt-1 text-muted-foreground">A business, its tables and its owner app are created only when you approve.</p>
      </div>
      <Chips value={filter} onChange={setFilter} options={[["pending", "Waiting", count("pending")], ["approved", "Approved", count("approved")], ["rejected", "Rejected", count("rejected")], ["all", "All", all.length]]} />
      {q.isLoading ? <ListSkeleton /> : q.isError ? <Empty title="Couldn't load applications" body={(q.error as Error).message} />
        : list.length ? <div className="space-y-3">{list.map((a) => <ApplicationCard key={a.id} a={a} />)}</div>
        : <Empty title={filter === "pending" ? "Nothing waiting" : "Nothing here"} body={filter === "pending" ? "You're all caught up." : "Try another filter."} />}
    </div>
  )
}

function ApplicationCard({ a }: { a: AdminApplication }) {
  const [confirm, setConfirm] = useState(false)
  const [reject, setReject] = useState(false)
  const approve = useAdminMutation(() => adminApi.decideApplication(a.id, "approve"), () => `${a.name} is approved and set up`)
  const no = useAdminMutation((reason: string) => adminApi.decideApplication(a.id, "reject", reason), () => `${a.name} was sent back to the owner`)
  const tone: Record<AdminApplication["status"], Tone> = { pending: "warn", approved: "good", rejected: "bad", withdrawn: "muted" }
  const label: Record<AdminApplication["status"], string> = { pending: "Waiting", approved: "Approved", rejected: "Rejected", withdrawn: "Withdrawn" }
  return (
    <article className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg leading-tight font-semibold break-words">{a.name}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {TYPE_LABEL[a.business_type] ?? a.business_type}{a.business_type === "hostel" && ` · ${AUDIENCE_LABEL[a.audience] ?? a.audience}`} · {a.city || "No city"} · /p/{a.slug}
          </p>
        </div>
        <Pill tone={tone[a.status]}>{label[a.status]}</Pill>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-muted-foreground">Plan</dt><dd className="font-medium">{a.plan_price_paise != null ? `${formatRupees(a.plan_price_paise)} / month` : "Not set"}</dd></div>
        <div><dt className="text-muted-foreground">Applied</dt><dd className="font-medium">{timeAgo(a.created_at)}</dd></div>
        {a.decided_at && <div><dt className="text-muted-foreground">Decided</dt><dd className="font-medium">{timeAgo(a.decided_at)}</dd></div>}
      </dl>
      {a.note && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">“{a.note}”</p>}
      <div className="mt-3"><Contact name={a.applicant_name} email={a.applicant_email} phone={a.phone} /></div>
      {a.decision_note && <p className="mt-2 text-sm text-muted-foreground">Your note: {a.decision_note}</p>}
      {a.status === "pending" && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button variant="outline" className="h-11" onClick={() => setReject(true)}><X className="size-4" />Reject</Button>
          <Button className="h-11" disabled={approve.isPending} onClick={() => setConfirm(true)}><Check className="size-4" />{approve.isPending ? "Setting up…" : "Approve"}</Button>
        </div>
      )}
      {a.status === "approved" && a.tenant_slug && (
        <div className="mt-3"><Button asChild variant="outline" className="h-11"><Link to="/admin/places">See in places<ArrowUpRight className="size-4" /></Link></Button></div>
      )}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {a.name}?</AlertDialogTitle>
            <AlertDialogDescription>This creates the business and its owner app now. The owner can start adding members. Their public listing is reviewed separately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-11" onClick={() => approve.mutate(undefined)}>Approve and set up</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ReasonDialog open={reject} onOpenChange={setReject} title={`Reject ${a.name}?`} description="Nothing is created. The owner sees your reason and can apply again."
        cta="Reject application" busy={no.isPending} onConfirm={(r) => no.mutate(r, { onSuccess: () => setReject(false) })} />
    </article>
  )
}

// ───────────────────────── places ─────────────────────────

type PlaceFilter = "all" | "pending" | "live" | "suspended"

function PlacesPage() {
  usePageMeta({ title: "Places · Admin" })
  const [sp, setSp] = useSearchParams()
  const filter = (["all", "pending", "live", "suspended"].includes(sp.get("filter") ?? "") ? sp.get("filter") : "all") as PlaceFilter
  const setFilter = (f: PlaceFilter) => setSp(f === "all" ? {} : { filter: f }, { replace: true })
  const [q, setQ] = useState("")
  const places = useQuery({ queryKey: ["admin", "places"], queryFn: adminApi.places })
  const all = places.data ?? []
  const match: Record<PlaceFilter, (p: AdminPlace) => boolean> = {
    all: () => true,
    pending: (p) => p.moderation_status === "pending",
    live: (p) => p.moderation_status === "approved" && p.visibility === "listed",
    suspended: (p) => p.status === "suspended" || p.moderation_status === "suspended",
  }
  const needle = q.trim().toLowerCase()
  const list = all.filter(match[filter]).filter((p) => !needle || [p.name, p.slug, p.city, p.owner_name, p.owner_email, p.contact_phone].some((v) => v?.toLowerCase().includes(needle)))
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Places</h1>
        <p className="mt-1 text-muted-foreground">Every approved business. Review public listings, verify, or suspend.</p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, city, owner or phone" aria-label="Search places" className="h-12 rounded-full pl-11" />
      </div>
      <Chips value={filter} onChange={setFilter} options={[["all", "All", all.length], ["pending", "Listing to review", all.filter(match.pending).length], ["live", "Live", all.filter(match.live).length], ["suspended", "Suspended", all.filter(match.suspended).length]]} />
      {places.isLoading ? <ListSkeleton /> : places.isError ? <Empty title="Couldn't load places" body={(places.error as Error).message} />
        : list.length ? <div className="space-y-3">{list.map((p) => <PlaceCard key={p.id} p={p} />)}</div>
        : <Empty title="No places here" body={needle ? "Nothing matches your search." : "Approved applications show up here."} />}
    </div>
  )
}

function listingPill(p: AdminPlace) {
  switch (p.moderation_status) {
    case "pending": return <Pill tone="warn">Listing to review</Pill>
    case "approved": return p.visibility === "listed" ? <Pill tone="good">Live</Pill> : <Pill tone="muted">Approved · hidden</Pill>
    case "rejected": return <Pill tone="bad">Listing rejected</Pill>
    case "suspended": return <Pill tone="bad">Listing suspended</Pill>
    default: return <Pill tone="muted">Draft</Pill>
  }
}

function PlaceCard({ p }: { p: AdminPlace }) {
  const [ask, setAsk] = useState<null | "reject" | "suspend">(null)
  const mod = useAdminMutation((a: { action: "approve" | "reject" | "suspend" | "verify" | "unverify"; note?: string }) => adminApi.moderate(p.id, a.action, a.note),
    (a) => ({ approve: `${p.name} is live`, reject: "Listing sent back", suspend: "Listing suspended", verify: `${p.name} is verified`, unverify: "Verification removed" })[a.action])
  const status = useAdminMutation((s: AdminPlace["status"]) => adminApi.setStatus(p.id, s), (s) => s === "suspended" ? `${p.name} is suspended` : `${p.name} is running again`)
  const suspended = p.status === "suspended"
  return (
    <article className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-lg leading-tight font-semibold break-words">
            {p.name}{p.verified_level === "verified" && <BadgeCheck className="size-5 shrink-0 text-leaf" aria-label="Verified" />}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{TYPE_LABEL[p.business_type] ?? p.business_type} · {p.city || "No city"} · /p/{p.slug}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`Actions for ${p.name}`}><MoreVertical className="size-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {p.moderation_status === "approved" && p.visibility === "listed" && (
              <DropdownMenuItem asChild className="min-h-11"><a href={`/p/${p.slug}`} target="_blank" rel="noreferrer"><ArrowUpRight className="size-4" />Open public page</a></DropdownMenuItem>
            )}
            {p.verified_level === "verified"
              ? <DropdownMenuItem className="min-h-11" onSelect={() => mod.mutate({ action: "unverify" })}><BadgeCheck className="size-4" />Remove verified badge</DropdownMenuItem>
              : <DropdownMenuItem className="min-h-11" onSelect={() => mod.mutate({ action: "verify" })}><BadgeCheck className="size-4" />Mark as verified</DropdownMenuItem>}
            {p.moderation_status !== "suspended" && p.moderation_status !== "draft" && (
              <DropdownMenuItem className="min-h-11" onSelect={() => setAsk("suspend")}><Flag className="size-4" />Suspend listing</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {suspended
              ? <DropdownMenuItem className="min-h-11" onSelect={() => status.mutate("active")}><ShieldCheck className="size-4" />Reactivate place</DropdownMenuItem>
              : <DropdownMenuItem className="min-h-11 text-destructive focus:text-destructive" onSelect={() => status.mutate("suspended")}><X className="size-4" />Suspend whole place</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {listingPill(p)}
        <Pill tone={suspended ? "bad" : p.status === "closed" ? "muted" : "good"}>{suspended ? "Place suspended" : p.status === "trial" ? "Running · trial" : p.status === "active" ? "Running" : "Closed"}</Pill>
        <Pill tone="muted">{p.members} {p.business_type === "hostel" ? "residents" : "members"}</Pill>
      </div>
      <div className="mt-3"><Contact name={p.owner_name} email={p.owner_email} phone={p.contact_phone} /></div>
      <p className="mt-1 text-[13px] text-muted-foreground">Approved {timeAgo(p.created_at)}{p.last_activity && ` · last activity ${timeAgo(p.last_activity)}`}</p>
      {p.moderation_status === "pending" && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button variant="outline" className="h-11" onClick={() => setAsk("reject")}><X className="size-4" />Needs changes</Button>
          <Button className="h-11" disabled={mod.isPending} onClick={() => mod.mutate({ action: "approve" })}><ClipboardCheck className="size-4" />Publish listing</Button>
        </div>
      )}
      <ReasonDialog open={ask !== null} onOpenChange={(o) => !o && setAsk(null)}
        title={ask === "suspend" ? `Suspend ${p.name}'s listing?` : `Send ${p.name}'s listing back?`}
        description={ask === "suspend" ? "It leaves search at once. The owner app keeps working." : "It stays hidden until the owner fixes it and submits again."}
        cta={ask === "suspend" ? "Suspend listing" : "Send back"} busy={mod.isPending}
        onConfirm={(note) => mod.mutate({ action: ask === "suspend" ? "suspend" : "reject", note }, { onSuccess: () => setAsk(null) })} />
    </article>
  )
}

// ───────────────────────── reports ─────────────────────────

function ReportsPage() {
  usePageMeta({ title: "Reports · Admin" })
  const [filter, setFilter] = useState<"open" | "all">("open")
  const reports = useQuery({ queryKey: ["admin", "reports"], queryFn: adminApi.reports })
  const places = useQuery({ queryKey: ["admin", "places"], queryFn: adminApi.places })
  const name = (id: string) => places.data?.find((p) => p.id === id)
  const all = reports.data ?? []
  const list = filter === "open" ? all.filter((r) => r.status === "open") : all
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-muted-foreground">What visitors flagged on public pages.</p>
      </div>
      <Chips value={filter} onChange={setFilter} options={[["open", "Open", all.filter((r) => r.status === "open").length], ["all", "All", all.length]]} />
      {reports.isLoading ? <ListSkeleton /> : reports.isError ? <Empty title="Couldn't load reports" body={(reports.error as Error).message} />
        : list.length ? <div className="space-y-3">{list.map((r) => <ReportCard key={r.id} r={r} place={name(r.tenant_id)} />)}</div>
        : <Empty title="No reports" body="Nobody has flagged a listing." />}
    </div>
  )
}

function ReportCard({ r, place }: { r: AdminReport; place?: AdminPlace }) {
  const act = useAdminMutation((a: "dismissed" | "warned" | "suspended") => adminApi.handleReport(r.id, a),
    (a) => ({ dismissed: "Report dismissed", warned: "Marked as warned", suspended: "Listing suspended" })[a])
  return (
    <article className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg leading-tight font-semibold">{place?.name ?? "Unknown place"}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{r.reason} · {timeAgo(r.created_at)}</p>
        </div>
        <Pill tone={r.status === "open" ? "warn" : r.status === "suspended" ? "bad" : "muted"}>{r.status === "open" ? "Open" : r.status[0].toUpperCase() + r.status.slice(1)}</Pill>
      </div>
      {r.details && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm break-words">{r.details}</p>}
      {place && <div className="mt-3"><Contact name={place.owner_name} email={place.owner_email} phone={place.contact_phone} /></div>}
      {r.status === "open" && (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:justify-end">
          <Button variant="outline" className="h-11" disabled={act.isPending} onClick={() => act.mutate("dismissed")}>Dismiss</Button>
          <Button variant="outline" className="h-11" disabled={act.isPending} onClick={() => act.mutate("warned")}>Warned</Button>
          <Button variant="destructive" className="h-11" disabled={act.isPending} onClick={() => act.mutate("suspended")}>Suspend</Button>
        </div>
      )}
    </article>
  )
}
