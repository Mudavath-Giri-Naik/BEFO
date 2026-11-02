import { useQueryClient } from "@tanstack/react-query"
import { Banknote, MessageCircle, Phone, Search } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  const members = useOwnerQuery("members", (a, t) => a.members(t))
  const plural = tenant.type === "hostel" ? "Residents" : "Members"
  usePageMeta({ title: `${plural} · ${tenant.name}` })
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (members.data ?? []).filter((m) => match(filter, m) && (!s || m.name.toLowerCase().includes(s) || m.phone.includes(s) || m.code.toLowerCase() === s))
      .sort((a, b) => (a.days_left ?? -999) - (b.days_left ?? -999))
  }, [members.data, filter, q])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{plural} <span className="text-base font-normal text-muted-foreground">{members.data?.length ?? ""}</span></h1>
        <AddMemberDialog trigger={<Button variant="outline" className="h-11">Add</Button>} />
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone or code" aria-label="Search" className="h-12 pl-10" />
      </div>
      <ToggleGroup type="single" variant="outline" value={filter} onValueChange={(v) => { const n = new URLSearchParams(sp); if (!v || v === "all") n.delete("status"); else n.set("status", v); setSp(n, { replace: true }) }} className="flex-wrap justify-start">
        {(Object.keys(FILTERS) as Filter[]).map((f) => <ToggleGroupItem key={f} value={f} className="h-10 px-3">{FILTERS[f]} {members.data && <span className="ml-1 text-muted-foreground">{members.data.filter((m) => match(f, m)).length}</span>}</ToggleGroupItem>)}
      </ToggleGroup>

      {members.isLoading ? <Skeleton className="h-64" /> : list.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">{members.data?.length ? "Nobody matches." : `No ${plural.toLowerCase()} yet. Add people or import your list.`}</div>
      ) : (
        <>
          {/* phone: cards */}
          <ul className="space-y-2 md:hidden">
            {list.map((m) => (
              <li key={m.member_id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{m.name}</p>
                    <p className="text-sm text-muted-foreground">{m.room_label ? `Room ${m.room_label} · ` : ""}{m.due_on ? `Due ${formatDateHuman(m.due_on)}` : "No payment yet"}</p>
                  </div>
                  <StatusBadge status={m.sub_status} daysLeft={m.days_left} />
                </div>
                <RowActions m={m} onPay={() => setPaying(m)} />
              </li>
            ))}
          </ul>
          {/* laptop: table */}
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead>{tenant.type === "hostel" && <TableHead>Room</TableHead>}<TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead>Code</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {list.map((m) => (
                  <TableRow key={m.member_id}>
                    <TableCell><p className="font-semibold">{m.name}</p><p className="text-xs text-muted-foreground">{formatPhone(m.phone)}</p></TableCell>
                    {tenant.type === "hostel" && <TableCell>{m.room_label ?? "—"}</TableCell>}
                    <TableCell className="tabular-nums">{m.due_on ? formatDateHuman(m.due_on) : "—"}</TableCell>
                    <TableCell><StatusBadge status={m.sub_status} daysLeft={m.days_left} /></TableCell>
                    <TableCell className="font-mono text-sm">{m.code}</TableCell>
                    <TableCell className="text-right"><RowActions m={m} onPay={() => setPaying(m)} compact /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      <MarkPaidDrawer member={paying} onClose={() => setPaying(null)} />
    </div>
  )
}

function RowActions({ m, onPay, compact }: { m: MemberRow; onPay: () => void; compact?: boolean }) {
  const { tenant } = useOwner()
  const plans = useOwnerQuery("plans", (a, t) => a.plans(t))
  const price = plans.data?.find((p) => p.id === m.plan_id)?.price_paise
  const reminder = `Hi ${m.name.split(" ")[0]}, your ${tenant.name} fee${price ? ` of ${formatRupees(price)}` : ""} ${m.sub_status === "expired" ? `was due on ${m.due_on ? formatDateHuman(m.due_on) : "earlier"}` : `is due on ${m.due_on ? formatDateHuman(m.due_on) : "soon"}`}. Please pay and write ${m.code} in the UPI note. Thank you!`
  return (
    <div className={compact ? "inline-flex gap-1" : "mt-2 flex gap-2"}>
      <Button variant={compact ? "ghost" : "default"} className={compact ? "h-10" : "h-11 flex-1"} onClick={onPay}><Banknote className="size-4" />Mark paid</Button>
      <Button asChild variant="ghost" size="icon" className="size-11" aria-label={`Call ${m.name}`}><a href={`tel:${m.phone}`}><Phone className="size-5" /></a></Button>
      {(m.sub_status === "expired" || m.sub_status === "expiring_soon" || m.sub_status === "no_payment") && (
        <Button asChild variant="ghost" size="icon" className="size-11" aria-label={`WhatsApp reminder to ${m.name}`}><a href={waLink(m.phone, reminder)} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-5" /></a></Button>
      )}
    </div>
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

export function AddMemberDialog({ trigger }: { trigger: ReactNode }) {
  const { api, tenant } = useOwner()
  const refresh = useRefresh()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const save = async () => {
    if (!normalizePhone(phone)) return toast.error("Enter a 10-digit mobile number.")
    try { await api.addMember(tenant, name, phone); toast.success(`${name} added`); setOpen(false); setName(""); setPhone(""); refresh() } catch (e) { showActionError(e) }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
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
export function RecordCashDialog({ trigger }: { trigger: ReactNode }) {
  const members = useOwnerQuery("members", (a, t) => a.members(t))
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [picked, setPicked] = useState<MemberRow | null>(null)
  const list = (members.data ?? []).filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
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
