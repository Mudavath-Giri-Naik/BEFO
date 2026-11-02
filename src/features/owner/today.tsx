import { ArrowRight, BedDouble, CircleAlert, Clock, Inbox, Users } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateHuman, timeAgo } from "@/lib/dates"
import { formatRupees } from "@/lib/money"
import { usePageMeta } from "@/lib/meta"
import { useOwner, useOwnerQuery } from "./context"

/** The 10-second screen (§16.1). Numbers come from SQL (owner_today). */
export default function TodayPage() {
  const { tenant, base } = useOwner()
  const { data: d, isLoading } = useOwnerQuery("today", (a, t) => a.today(t))
  usePageMeta({ title: `Today · ${tenant.name}` })
  if (isLoading || !d) return <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-40" /></div>
  const inbox = d.claims_waiting + d.requests_waiting
  const label = tenant.type === "hostel" ? "residents" : "members"
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Today <span className="text-base font-normal text-muted-foreground">· {formatDateHuman(d.today)}</span></h1>

      {inbox > 0 ? (
        <Link to={`${base}/inbox`} className="flex items-center gap-4 rounded-2xl border-2 border-primary/30 bg-card p-4 outline-none hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <Inbox className="size-8 shrink-0 text-primary" aria-hidden />
          <div className="flex-1">
            <p className="text-lg font-bold">{inbox} {inbox === 1 ? "thing needs" : "things need"} your answer</p>
            <p className="text-sm text-muted-foreground">{d.requests_waiting} join request{d.requests_waiting === 1 ? "" : "s"} · {d.claims_waiting} payment{d.claims_waiting === 1 ? "" : "s"} to confirm</p>
          </div>
          <ArrowRight className="size-5 text-muted-foreground" />
        </Link>
      ) : (
        <div className="rounded-2xl border bg-leaf-soft/60 p-4 font-semibold text-leaf">Nothing waiting for you. All clear.</div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Summary">
        <Stat label="Collected this month" value={formatRupees(d.collected_month_paise)} hint="Deposits not included" />
        <Stat label="Still to collect" value={formatRupees(d.pending_paise)} hint={`${d.overdue} overdue`} tone={d.overdue ? "warn" : undefined} />
        <Stat label={`Active ${label}`} value={`${d.members_active} / ${d.members_total}`} hint={`${d.expiring_soon} due in 3 days`} />
        {d.beds_total != null
          ? <Stat label={tenant.type === "hostel" ? "Beds free" : "Seats open"} value={`${d.beds_free} / ${d.beds_total}`}
              hint={d.availability_updated_at ? `Checked ${timeAgo(d.availability_updated_at)}` : "Not set"} />
          : <Stat label="Expenses this month" value={d.expense_month_paise != null ? formatRupees(d.expense_month_paise) : "—"} />}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Worth a look</h2>
        <ul className="divide-y rounded-xl border bg-card">
          {d.overdue > 0 && <Row icon={CircleAlert} text={`${d.overdue} ${label} have not paid`} to={`${base}/members?status=overdue`} action="See list" />}
          {d.expiring_soon > 0 && <Row icon={Clock} text={`${d.expiring_soon} due in the next 3 days — reminders go out automatically`} to={`${base}/members?status=soon`} action="See" />}
          {d.beds_total != null && <Row icon={BedDouble} text="Is your availability still correct?" to={`${base}/rooms`} action="Check" />}
          <Row icon={Users} text={`Your public page is ${d.listing === "approved" && d.visibility === "listed" ? "live" : d.listing}`} to={`/p/${tenant.slug}`} action="View" />
        </ul>
      </section>
      <p className="text-xs text-muted-foreground">Your weekly routine: open Inbox once a week, confirm what's waiting, done.</p>
    </div>
  )
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`font-display text-2xl font-bold tabular-nums ${tone === "warn" ? "text-destructive" : ""}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
function Row({ icon: Icon, text, to, action }: { icon: React.ComponentType<{ className?: string }>; text: string; to: string; action: string }) {
  return (
    <li className="flex items-center gap-3 p-3">
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm">{text}</span>
      <Button asChild variant="ghost" className="h-11"><Link to={to}>{action}</Link></Button>
    </li>
  )
}
