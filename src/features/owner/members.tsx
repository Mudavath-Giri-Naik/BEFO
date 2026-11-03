import { useQueryClient } from "@tanstack/react-query"
import { Banknote, ChevronRight, MessageCircle, Phone, Plus, Search } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatDateHuman, tenantToday } from "@/lib/dates"
import { formatRupees, parseIndianAmount } from "@/lib/money"
import { formatPhone, normalizePhone, waLink } from "@/lib/phone"
import { usePageMeta } from "@/lib/meta"
import type { MemberRow } from "./api"
import { showActionError, useOwner, useOwnerQuery } from "./context"
import { StatusBadge } from "./status"

const FILTERS = { all: "All", overdue: "Overdue", soon: "Due soon", active: "Active" } as const
type Filter = keyof typeof FILTERS
const match = (f: Filter, m: MemberRow) =>
  f === "all" || (f === "overdue" && (m.sub_status === "expired" || m.sub_status === "no_payment")) || (f === "soon" && m.sub_status === "expiring_soon") || (f === "active" && m.sub_status === "active")

export default function MembersPage() {
  const { tenant } = useOwner()
  const [sp, setSp] = useSearchParams()
  const filter = (sp.get("status") as Filter) in FILTERS ? (sp.get("status") as Filter) : "all"
  const [q, setQ] = useState("")
  const [paying, setPaying] = useState<MemberRow | null>(null)
  const [open, setOpen] = useState<MemberRow | null>(null)
  const members = useOwnerQuery("members", (a, t) => a.members(t))
  const plans = useOwnerQuery("plans", (a, t) => a.plans(t))
  const plural = tenant.type === "hostel" ? "Residents" : "Members"
  usePageMeta({ title: `${plural} · ${tenant.name}` })
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (members.data ?? []).filter((m) => match(filter, m) && (!s || m.name.toLowerCase().includes(s) || m.phone.includes(s) || m.code.toLowerCase() === s))
      .sort((a, b) => (a.days_left ?? -999) - (b.days_left ?? -999))
  }, [members.data, filter, q])
  const price = (m: MemberRow) => plans.data?.find((p) => p.id === m.plan_id)?.price_paise
  const setFilter = (f: Filter) => { const n = new URLSearchParams(sp); if (f === "all") n.delete("status"); else n.set("status", f); setSp(n, { replace: true }) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] leading-none tracking-[-0.03em]">{plural} <span className="text-[18px] text-muted-foreground tabular-nums">{members.data?.length ?? ""}</span></h1>
        <AddMemberDialog trigger={<button type="button" aria-label={`Add ${plural.toLowerCase().slice(0, -1)}`} className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground"><Plus className="size-5" /></button>} />
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone or code" aria-label="Search" className="h-12 rounded-full bg-card pl-11 text-[16px]" />
      </div>
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0">
        <div role="radiogroup" aria-label="Status" className="flex w-max gap-2">
          {(Object.keys(FILTERS) as Filter[]).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}
              className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-[14px] whitespace-nowrap transition-colors",
                filter === f ? "border-primary bg-primary text-primary-foreground" : "border-foreground/12 text-muted-foreground hover:text-foreground")}>
              {FILTERS[f]}{members.data && <span className={cn("tabular-nums", filter === f ? "opacity-70" : "opacity-60")}>{members.data.filter((m) => match(f, m)).length}</span>}
            </button>
          ))}
        </div>
      </div>

      {members.isLoading ? <Skeleton className="h-72 rounded-[24px]" /> : list.length === 0 ? (
        <div className="rounded-[24px] border border-dashed p-10 text-center text-muted-foreground">{members.data?.length ? "Nobody matches." : `No ${plural.toLowerCase()} yet. Add people or import your list.`}</div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-foreground/12 bg-card">
          {/* header row (tablet and up) */}
          <div className="hidden grid-cols-[minmax(0,2.2fr)_1fr_1.1fr_auto] items-center gap-4 border-b border-foreground/10 px-5 py-3 text-[13px] text-muted-foreground md:grid">
            <span>Name</span><span>{tenant.type === "hostel" ? "Room" : "Code"}</span><span>Due</span><span className="w-[220px] text-right">Status & actions</span>
          </div>
          <ul className="divide-y divide-foreground/10">
            {list.map((m) => (
              <li key={m.member_id} className="group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 md:grid-cols-[minmax(0,2.2fr)_1fr_1.1fr_auto] md:gap-4 md:px-5">
                {/* whole row opens the person's sheet */}
                <button type="button" onClick={() => setOpen(m)} className="absolute inset-0 outline-none focus-visible:bg-muted/60 hover:bg-muted/40" aria-label={`Open ${m.name}`} />
                <div className="pointer-events-none relative flex min-w-0 items-center gap-3 md:col-auto">
                  <Avatar name={m.name} status={m.sub_status} />
                  <div className="min-w-0 md:hidden">
                    <p className="truncate text-[15px] font-medium">{m.name}</p>
                    <p className="truncate text-[13px] text-muted-foreground">{m.room_label ? `Room ${m.room_label} · ` : ""}{m.due_on ? `Due ${formatDateHuman(m.due_on)}` : "No payment yet"}</p>
                  </div>
                  <div className="hidden min-w-0 md:block">
                    <p className="truncate text-[15px] font-medium">{m.name}</p>
                    <p className="truncate text-[13px] text-muted-foreground tabular-nums">{formatPhone(m.phone)}</p>
                  </div>
                </div>
                <span className="pointer-events-none relative hidden text-[14px] tabular-nums md:block">{tenant.type === "hostel" ? (m.room_label ?? "—") : <span className="font-mono text-[13px]">{m.code}</span>}</span>
                <span className="pointer-events-none relative hidden text-[14px] tabular-nums md:block">{m.due_on ? formatDateHuman(m.due_on) : "—"}</span>
                <div className="pointer-events-none relative flex items-center justify-end gap-1.5 md:w-[220px] [&>a]:pointer-events-auto [&>button]:pointer-events-auto">
                  <span className="pointer-events-none"><StatusBadge status={m.sub_status} daysLeft={m.days_left} /></span>
                  {/* laptop: quiet inline actions */}
                  <button type="button" onClick={() => setPaying(m)} className="hidden h-9 items-center gap-1.5 rounded-full border border-foreground/12 px-3 text-[13px] hover:bg-muted md:inline-flex">
                    <Banknote className="size-4" strokeWidth={1.75} />Paid
                  </button>
                  <a href={`tel:${m.phone}`} aria-label={`Call ${m.name}`} className="hidden size-9 items-center justify-center rounded-full hover:bg-muted md:flex"><Phone className="size-4" strokeWidth={1.75} /></a>
                  <ChevronRight className="pointer-events-none size-4 text-muted-foreground md:hidden" aria-hidden />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <MemberSheet member={open} price={open ? price(open) : undefined} onClose={() => setOpen(null)} onPay={(m) => { setOpen(null); setPaying(m) }} />
      <MarkPaidDrawer member={paying} onClose={() => setPaying(null)} />
    </div>
  )
}

const AVATAR_TONE: Record<string, string> = {
  active: "bg-leaf-soft text-leaf", expiring_soon: "bg-turmeric-soft text-accent-foreground",
  expired: "bg-destructive/12 text-destructive", no_payment: "bg-destructive/12 text-destructive",
}
function Avatar({ name, status }: { name: string; status: string }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
  return <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold", AVATAR_TONE[status] ?? "bg-muted text-muted-foreground")} aria-hidden>{initials}</span>
}

/** Everything about one person, with the actions: opened by tapping their row. */
function MemberSheet({ member: m, price, onClose, onPay }: { member: MemberRow | null; price?: number; onClose: () => void; onPay: (m: MemberRow) => void }) {
  const { tenant } = useOwner()
  if (!m) return null
  const due = m.sub_status === "expired" || m.sub_status === "expiring_soon" || m.sub_status === "no_payment"
  const reminder = `Hi ${m.name.split(" ")[0]}, your ${tenant.name} fee${price ? ` of ${formatRupees(price)}` : ""} ${m.sub_status === "expired" ? `was due on ${m.due_on ? formatDateHuman(m.due_on) : "earlier"}` : `is due on ${m.due_on ? formatDateHuman(m.due_on) : "soon"}`}. Please pay and write ${m.code} in the UPI note. Thank you!`
  const facts: [string, string][] = [
    ["Phone", formatPhone(m.phone)], ["Member code", m.code],
    ["Plan", price ? `${formatRupees(price)} / month` : "—"],
    ["Due on", m.due_on ? formatDateHuman(m.due_on) : "No payment yet"],
    ["Last paid", m.last_paid_on ? formatDateHuman(m.last_paid_on) : "—"],
    ...(m.room_label ? [["Room", m.room_label] as [string, string]] : []),
    ...(m.deposit_held_paise ? [["Deposit held", formatRupees(m.deposit_held_paise)] as [string, string]] : []),
  ]
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="flex flex-row items-center gap-3 px-0 text-left">
            <Avatar name={m.name} status={m.sub_status} />
            <div className="min-w-0 flex-1">
              <DrawerTitle className="truncate text-[20px] font-medium">{m.name}</DrawerTitle>
              <DrawerDescription className="mt-0.5"><StatusBadge status={m.sub_status} daysLeft={m.days_left} /></DrawerDescription>
            </div>
          </DrawerHeader>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-[20px] border border-foreground/10 p-4">
            {facts.map(([k, v]) => (
              <div key={k} className="min-w-0"><dt className="text-[12px] text-muted-foreground">{k}</dt><dd className="truncate text-[15px] tabular-nums">{v}</dd></div>
            ))}
          </dl>
          <Button size="lg" className="mt-4 h-12 w-full rounded-full text-[15px]" onClick={() => onPay(m)}><Banknote className="size-5" />Mark paid</Button>
          <div className={cn("mt-2 grid gap-2", due ? "grid-cols-2" : "grid-cols-1")}>
            <Button asChild variant="outline" className="h-12 rounded-full"><a href={`tel:${m.phone}`}><Phone className="size-4" />Call</a></Button>
            {due && <Button asChild variant="outline" className="h-12 rounded-full"><a href={waLink(m.phone, reminder)} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" />Remind on WhatsApp</a></Button>}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function useRefresh() {
  const qc = useQueryClient()
  const { tenant } = useOwner()
  return () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "owner" && q.queryKey[2] === tenant.id })
}

/** Mark paid: date defaults to today, amount to the plan price, method chips (§16.3). */
function MarkPaidDrawer({ member, onClose }: { member: MemberRow | null; onClose: () => void }) {
  const { api } = useOwner()
  const refresh = useRefresh()
  const plans = useOwnerQuery("plans", (a, t) => a.plans(t))
  const price = plans.data?.find((p) => p.id === member?.plan_id)?.price_paise ?? 0
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("cash")
  const [date, setDate] = useState(tenantToday())
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (!member) return
    const paise = amount ? parseIndianAmount(amount) : BigInt(price)
    if (!paise || paise <= 0n) return toast.error("Enter the amount received.")
    setBusy(true)
    try {
      await api.markPaid(member.member_id, Number(paise), date, method)
      toast.success(`${formatRupees(paise)} from ${member.name} recorded`)
      refresh(); onClose(); setAmount("")
    } catch (e) { showActionError(e) } finally { setBusy(false) }
  }
  return (
    <Drawer open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader><DrawerTitle>Mark paid · {member?.name}</DrawerTitle><DrawerDescription>Use this when you have the money (cash, or seen in your UPI app).</DrawerDescription></DrawerHeader>
          <div className="space-y-4 px-4">
            <div className="space-y-2"><Label htmlFor="amt">Amount (₹)</Label>
              <Input id="amt" inputMode="decimal" className="h-14 font-display text-2xl" value={amount} placeholder={price ? String(price / 100) : ""} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="space-y-2"><Label>Paid by</Label>
              <ToggleGroup type="single" variant="outline" value={method} onValueChange={(v) => v && setMethod(v)} className="justify-start">
                {["cash", "upi", "bank"].map((m) => <ToggleGroupItem key={m} value={m} className="h-11 px-4">{m === "upi" ? "UPI" : m[0].toUpperCase() + m.slice(1)}</ToggleGroupItem>)}
              </ToggleGroup></div>
            <div className="space-y-2"><Label htmlFor="pd">Date</Label><Input id="pd" type="date" max={tenantToday()} value={date} onChange={(e) => setDate(e.target.value)} className="h-12" /></div>
          </div>
          <DrawerFooter><Button size="lg" className="h-12" disabled={busy} onClick={save}>Save payment</Button></DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

type DialogProps = { trigger?: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }

/** Uncontrolled with a trigger, or controlled (open/onOpenChange) when opened from elsewhere, e.g. Quick add. */
function useDialogState({ open, onOpenChange }: DialogProps) {
  const [own, setOwn] = useState(false)
  return [open ?? own, onOpenChange ?? setOwn] as const
}

export function AddMemberDialog(props: DialogProps) {
  const { api, tenant } = useOwner()
  const refresh = useRefresh()
  const [open, setOpen] = useDialogState(props)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const save = async () => {
    if (!normalizePhone(phone)) return toast.error("Enter a 10-digit mobile number.")
    try { await api.addMember(tenant, name, phone); toast.success(`${name} added`); setOpen(false); setName(""); setPhone(""); refresh() } catch (e) { showActionError(e) }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {props.trigger && <DialogTrigger asChild>{props.trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader><DialogTitle>Add {tenant.type === "hostel" ? "resident" : "member"}</DialogTitle><DialogDescription>When they log in with this number, they are linked automatically.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label htmlFor="nm">Name</Label><Input id="nm" value={name} onChange={(e) => setName(e.target.value)} className="h-12" autoComplete="off" /></div>
          <div className="space-y-2"><Label htmlFor="ph">Mobile number</Label><Input id="ph" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12" /></div>
        </div>
        <DialogFooter><Button className="h-11" disabled={!name.trim() || !phone} onClick={save}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Quick action: pick a person → amount defaults to their plan → save. */
export function RecordCashDialog(props: DialogProps) {
  const members = useOwnerQuery("members", (a, t) => a.members(t))
  const [open, setOpen] = useDialogState(props)
  const [q, setQ] = useState("")
  const [picked, setPicked] = useState<MemberRow | null>(null)
  const list = (members.data ?? []).filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {props.trigger && <DialogTrigger asChild>{props.trigger}</DialogTrigger>}
        <DialogContent>
          <DialogHeader><DialogTitle>Who paid?</DialogTitle><DialogDescription>Pick the person. The amount is filled in from their plan.</DialogDescription></DialogHeader>
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name" className="h-12" />
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {list.map((m) => (
              <li key={m.member_id}><button className="flex min-h-12 w-full items-center justify-between rounded-lg px-3 text-left hover:bg-muted" onClick={() => { setPicked(m); setOpen(false) }}>
                <span className="font-semibold">{m.name}</span><StatusBadge status={m.sub_status} daysLeft={m.days_left} /></button></li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
      <MarkPaidDrawer member={picked} onClose={() => setPicked(null)} />
    </>
  )
}
