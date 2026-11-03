import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowUpRight, Building2, Clock, Compass, Home, LayoutDashboard, Plus, ShieldCheck, XCircle } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/session"
import { formatDateHuman, timeAgo } from "@/lib/dates"
import { usePageMeta } from "@/lib/meta"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface MyMembership { member_id: string; tenant_id: string; due_on: string | null; days_left: number | null; sub_status: string; room_label: string | null }

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Paid up", cls: "bg-leaf-soft text-leaf" },
  expiring_soon: { label: "Due soon", cls: "bg-turmeric-soft text-foreground" },
  expired: { label: "Overdue", cls: "bg-destructive/10 text-destructive" },
  no_payment: { label: "Not paid yet", cls: "bg-destructive/10 text-destructive" },
  paused: { label: "Paused", cls: "bg-muted text-muted-foreground" },
  former: { label: "Left", cls: "bg-muted text-muted-foreground" },
}

/** /me — one home for everyone: admin console, places you run, your applications, places you stay or eat at. */
export default function MyHome() {
  usePageMeta({ title: "Home" })
  const { user, context, contextSettled } = useAuth()
  const qc = useQueryClient()
  const memberIds = context?.memberships.map((m) => m.member_id) ?? []
  const mine = useQuery({
    queryKey: ["my-memberships", memberIds.join()],
    enabled: !!supabase && memberIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase!.from("member_overview").select("member_id, tenant_id, due_on, days_left, sub_status, room_label").in("member_id", memberIds)
      if (error) throw error
      return data as MyMembership[]
    },
  })
  const withdraw = async (id: string) => {
    const { error } = await supabase!.rpc("withdraw_application", { p_id: id })
    if (error) return toast.error(error.message)
    toast.success("Application withdrawn")
    qc.invalidateQueries({ queryKey: ["my-context"] })
  }

  if (!contextSettled) return <div className="mx-auto max-w-2xl space-y-3 px-4 py-10"><Skeleton className="h-10 w-48" /><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div>

  const first = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0]
  const staff = context?.staff ?? []
  const members = context?.memberships ?? []
  const apps = context?.applications ?? []
  const nothing = !context?.is_platform_admin && !staff.length && !members.length && !apps.length

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{first ? `Hi, ${first}` : "Your home"}</h1>
      <p className="mt-1 text-muted-foreground">{nothing ? "Find a place to stay or eat, or list the one you run." : "Everything you're part of, in one place."}</p>

      <div className="mt-8 space-y-8">
        {context?.is_platform_admin && (
          <Link to="/admin" className="flex min-h-20 items-center gap-4 rounded-2xl bg-primary p-5 text-primary-foreground transition-opacity hover:opacity-90">
            <ShieldCheck className="size-7 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1"><span className="block text-lg font-semibold">Admin dashboard</span><span className="block text-sm opacity-80">Approve places, review listings and reports</span></span>
            <ArrowUpRight className="size-6 shrink-0" aria-hidden />
          </Link>
        )}

        {apps.length > 0 && (
          <Section title="Your applications" icon={Clock}>
            {apps.map((a) => (
              <div key={a.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0"><p className="font-semibold break-words">{a.name}</p><p className="text-sm text-muted-foreground">Sent {timeAgo(a.created_at)}</p></div>
                  {a.status === "pending"
                    ? <span className="inline-flex h-6 items-center rounded-full bg-turmeric-soft px-2.5 text-[12px] font-semibold">Waiting for approval</span>
                    : <span className="inline-flex h-6 items-center gap-1 rounded-full bg-destructive/10 px-2.5 text-[12px] font-semibold text-destructive"><XCircle className="size-3.5" />Needs changes</span>}
                </div>
                {a.status === "pending" && <p className="mt-2 text-sm text-muted-foreground">We check every new place before it's set up. You'll get a notification when it's approved.</p>}
                {a.status === "rejected" && a.decision_note && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">“{a.decision_note}”</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.status === "pending"
                    ? <Button variant="outline" className="h-11" onClick={() => withdraw(a.id)}>Withdraw</Button>
                    : <Button asChild className="h-11"><Link to="/list-your-place">Apply again</Link></Button>}
                </div>
              </div>
            ))}
          </Section>
        )}

        {staff.length > 0 && (
          <Section title="Places you run" icon={Building2}>
            {staff.map((s) => (
              <Link key={s.slug} to={`/app/${s.slug}`} className="flex min-h-16 items-center gap-3 rounded-xl border bg-card px-4 transition-colors hover:border-primary">
                <span className="min-w-0 flex-1"><span className="block font-semibold break-words">{s.name}</span><span className="block text-sm text-muted-foreground capitalize">{s.role}{s.status === "suspended" && " · suspended"}</span></span>
                <LayoutDashboard className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            ))}
          </Section>
        )}

        {members.length > 0 && (
          <Section title="Where you stay or eat" icon={Home}>
            {members.map((m) => {
              const row = mine.data?.find((r) => r.member_id === m.member_id)
              const st = row ? STATUS[row.sub_status] : undefined
              return (
                <div key={m.member_id} className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 font-semibold break-words">{m.name}</p>
                    {mine.isLoading ? <Skeleton className="h-6 w-20 rounded-full" /> : st && <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold", st.cls)}>{st.label}</span>}
                  </div>
                  {row && (
                    <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      {row.due_on && <div><dt className="inline text-muted-foreground">Next due </dt><dd className="inline font-medium">{formatDateHuman(row.due_on)}</dd></div>}
                      {row.room_label && <div><dt className="inline text-muted-foreground">Room </dt><dd className="inline font-medium">{row.room_label}</dd></div>}
                    </dl>
                  )}
                </div>
              )
            })}
          </Section>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/explore" className="flex min-h-16 items-center gap-3 rounded-xl border bg-card px-4 transition-colors hover:border-primary">
            <Compass className="size-5 text-muted-foreground" aria-hidden /><span className="font-medium">Find a place</span>
          </Link>
          {!context?.is_platform_admin && (
            <Link to="/list-your-place" className="flex min-h-16 items-center gap-3 rounded-xl border bg-card px-4 transition-colors hover:border-primary">
              <Plus className="size-5 text-muted-foreground" aria-hidden /><span className="font-medium">{staff.length ? "Add another place" : "List your place"}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Icon className="size-5 text-muted-foreground" />{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
