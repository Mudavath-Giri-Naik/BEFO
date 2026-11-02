import { Banknote, BedDouble, ClipboardList, Home, Inbox, LayoutGrid, Plus, UserPlus, Users } from "lucide-react"
import { useState } from "react"
import { NavLink, Outlet } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useOwner, useOwnerQuery } from "./context"
import { AddMemberDialog, RecordCashDialog } from "./members"

export function OwnerShell({ switcher }: { switcher?: React.ReactNode }) {
  const { tenant, base, api } = useOwner()
  const today = useOwnerQuery("today", (a, t) => a.today(t))
  const inboxCount = (today.data?.claims_waiting ?? 0) + (today.data?.requests_waiting ?? 0)
  const nav = [
    { to: base, end: true, label: "Today", icon: Home },
    { to: `${base}/inbox`, label: "Inbox", icon: Inbox, count: inboxCount },
    { to: `${base}/members`, label: tenant.type === "hostel" ? "Residents" : "Members", icon: Users },
    ...(tenant.type === "hostel" ? [{ to: `${base}/rooms`, label: "Rooms", icon: BedDouble }] : [{ to: `${base}/menu`, label: "Menu", icon: ClipboardList }]),
    ...(tenant.can_see_money ? [{ to: `${base}/money`, label: "Money", icon: Banknote }] : []),
    { to: `${base}/more`, label: "More", icon: LayoutGrid },
  ]
  const link = ({ isActive }: { isActive: boolean }) =>
    cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold", isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")
  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 pt-4 pb-28 md:pb-10">
      <aside className="hidden w-56 shrink-0 md:block" aria-label="Owner menu">
        <div className="sticky top-20 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">{api.readOnly ? "Demo place" : tenant.role === "owner" ? "Owner" : "Manager"}</p>
            <p className="font-display text-lg leading-tight font-bold">{tenant.name}</p>
            {switcher}
          </div>
          <nav className="space-y-1">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={link}>
                <n.icon className="size-5" aria-hidden />{n.label}
                {!!n.count && <Badge variant="secondary" className="ml-auto">{n.count}</Badge>}
              </NavLink>
            ))}
          </nav>
          <QuickActions trigger={<Button className="h-11 w-full"><Plus className="size-5" />Quick add</Button>} />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mb-4 md:hidden">
          <p className="text-xs text-muted-foreground">{api.readOnly ? "Demo place" : tenant.role === "owner" ? "Owner" : "Manager"}</p>
          <p className="font-display text-xl font-bold">{tenant.name}</p>
          {switcher}
        </div>
        <Outlet />
      </div>
      {/* mobile bottom nav: Today · Inbox · [+] · Members · More (§9.3) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Owner menu">
        {[nav[0], nav[1]].map((n) => <BottomLink key={n.to} {...n} />)}
        <div className="flex items-center justify-center">
          <QuickActions trigger={<Button size="icon" className="size-14 -translate-y-3 rounded-full shadow-lg" aria-label="Quick add"><Plus className="size-7" /></Button>} />
        </div>
        <BottomLink {...nav[2]} />
        <BottomLink {...nav[nav.length - 1]} />
      </nav>
    </div>
  )
}

function BottomLink({ to, end, label, icon: Icon, count }: { to: string; end?: boolean; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => cn("relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>
      <Icon className="size-6" />{label}
      {!!count && <span className="absolute top-2 right-[calc(50%-20px)] rounded-full bg-destructive px-1.5 text-[10px] text-white">{count}</span>}
    </NavLink>
  )
}

function QuickActions({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const soon = ["Add expense (photo / voice / quick)", "Post notice", "Pay salary"]
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-2xl">
        <SheetHeader><SheetTitle>Quick add</SheetTitle><SheetDescription>Common jobs in two taps.</SheetDescription></SheetHeader>
        <div className="grid gap-2 px-4 pb-6">
          <RecordCashDialog trigger={<Button variant="outline" className="h-14 justify-start gap-3 text-base"><Banknote className="size-5" />Record cash received</Button>} />
          <AddMemberDialog trigger={<Button variant="outline" className="h-14 justify-start gap-3 text-base"><UserPlus className="size-5" />Add member</Button>} />
          {soon.map((s) => (
            <Button key={s} variant="outline" disabled className="h-14 justify-between text-base">{s}<Badge variant="secondary">Coming soon</Badge></Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
