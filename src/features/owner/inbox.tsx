import { useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Check, MessageCircle, Phone } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatDateHuman, timeAgo } from "@/lib/dates"
import { formatRupees } from "@/lib/money"
import { formatPhone, waLink } from "@/lib/phone"
import { usePageMeta } from "@/lib/meta"
import type { Claim, JoinRequest } from "./api"
import { showActionError, useOwner, useOwnerQuery } from "./context"

const REJECT_CHIPS = ["No beds free", "Not the right fit", "Couldn't reach you", "Wrong details"]

export default function InboxPage() {
  const { tenant } = useOwner()
  usePageMeta({ title: `Inbox · ${tenant.name}` })
  const req = useOwnerQuery("requests", (a, t) => a.requests(t))
  const claims = useOwnerQuery("claims", (a, t) => a.claims(t))
  const loading = req.isLoading || claims.isLoading
  const empty = !loading && !req.data?.length && !claims.data?.length
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Inbox</h1>
      {loading && <Skeleton className="h-40" />}
      {empty && <div className="rounded-xl border border-dashed p-10 text-center"><p className="text-lg font-semibold">Nothing waiting.</p><p className="text-muted-foreground">New join requests and payments show up here.</p></div>}
      {!!claims.data?.length && <ClaimsSection claims={claims.data} />}
      {!!req.data?.length && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Join requests <Badge variant="secondary">{req.data.length}</Badge></h2>
          {req.data.map((r) => <RequestCard key={r.id} r={r} />)}
        </section>
      )}
    </div>
  )
}

function useRefresh() {
  const qc = useQueryClient()
  const { tenant } = useOwner()
  return () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "owner" && q.queryKey[2] === tenant.id })
}

function ClaimsSection({ claims }: { claims: Claim[] }) {
  const { api } = useOwner()
  const refresh = useRefresh()
  const green = claims.filter((c) => c.checks.amount_match && c.checks.date_ok && !c.checks.duplicate_utr && !c.checks.duplicate_image)
  const confirmAll = async () => {
    try {
      for (const c of green) await api.decideClaim(c.id, "confirm")
      toast.success(`Confirmed ${green.length} payment${green.length === 1 ? "" : "s"}`)
      refresh()
    } catch (e) { showActionError(e) }
  }
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Payments to confirm <Badge variant="secondary">{claims.length}</Badge></h2>
        {green.length > 1 && <Button variant="outline" className="h-11" onClick={confirmAll}><Check className="size-4" />Confirm all {green.length} green</Button>}
      </div>
      <p className="text-sm text-muted-foreground">Check each amount in your own UPI or bank app first. Screenshots can be edited; your bank record is the truth.</p>
      {claims.map((c) => <ClaimCard key={c.id} c={c} />)}
    </section>
  )
}

function ClaimCard({ c }: { c: Claim }) {
  const { api } = useOwner()
  const refresh = useRefresh()
  const [ask, setAsk] = useState<null | "reject" | "needs_info">(null)
  const warnings = [
    c.checks.amount_match === false && "Amount is not the plan price",
    c.checks.date_ok === false && "Date looks wrong",
    c.checks.duplicate_utr && "This UTR was already used",
    c.checks.duplicate_image && "Same screenshot was sent before",
  ].filter(Boolean) as string[]
  const confirm = async () => {
    try { await api.decideClaim(c.id, "confirm"); toast.success(`Confirmed ${formatRupees(c.amount_paise)} from ${c.member_name}`); refresh() } catch (e) { showActionError(e) }
  }
  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold">{c.member_name}</p>
          <p className="text-sm text-muted-foreground">{c.method.toUpperCase()}{c.reference ? ` · UTR ${c.reference}` : ""} · paid {timeAgo(c.paid_at_claimed)}</p>
        </div>
        <p className="font-display text-2xl font-bold tabular-nums">{formatRupees(c.amount_paise)}</p>
      </div>
      {warnings.length > 0 && (
        <ul className="mt-2 space-y-1">{warnings.map((w) => <li key={w} className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="size-4" />{w}</li>)}</ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="h-11 flex-1 sm:flex-none" onClick={confirm}><Check className="size-4" />Confirm</Button>
        <Button variant="outline" className="h-11" onClick={() => setAsk("needs_info")}>Ask</Button>
        <Button variant="ghost" className="h-11 text-destructive" onClick={() => setAsk("reject")}>Not received</Button>
      </div>
      <NoteDialog open={!!ask} onOpenChange={(o) => !o && setAsk(null)} title={ask === "reject" ? "Why wasn't it received?" : "What do you need?"}
        chips={ask === "reject" ? ["Not in my account", "Wrong amount", "Duplicate"] : ["Send the UTR number", "Send a clearer screenshot", "Which month is this for?"]}
        onSubmit={async (note) => { try { await api.decideClaim(c.id, ask!, note); toast.success("Sent"); setAsk(null); refresh() } catch (e) { showActionError(e) } }} />
    </article>
  )
}

function RequestCard({ r }: { r: JoinRequest }) {
  const { api, tenant } = useOwner()
  const refresh = useRefresh()
  const plans = useOwnerQuery("plans", (a, t) => a.plans(t))
  const rooms = useOwnerQuery("rooms", (a, t) => a.rooms(t))
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [plan, setPlan] = useState<string>("")
  const [room, setRoom] = useState<string>("")
  const approve = async () => {
    try {
      await api.decideRequest(r.id, "approve", { planId: plan || undefined, roomId: room || undefined })
      toast.success(`${r.name} approved`); setApproving(false); refresh()
    } catch (e) { showActionError(e) }
  }
  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold">{r.name}</p>
          <p className="text-sm text-muted-foreground">{formatPhone(r.phone)} · verified · {timeAgo(r.created_at)}</p>
        </div>
        {r.move_in_date && <Badge variant="outline">From {formatDateHuman(r.move_in_date)}</Badge>}
      </div>
      {r.room_type_name && <p className="mt-2 text-sm">Wants: <span className="font-semibold">{r.room_type_name}</span></p>}
      {r.message && <p className="mt-2 rounded-lg bg-muted p-3 text-sm">“{r.message}”</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="h-11" onClick={() => setApproving(true)}><Check className="size-4" />Approve</Button>
        <Button variant="outline" className="h-11" onClick={async () => { try { await api.decideRequest(r.id, "waitlist"); toast.success("Added to waitlist"); refresh() } catch (e) { showActionError(e) } }}>Waitlist</Button>
        <Button variant="ghost" className="h-11 text-destructive" onClick={() => setRejecting(true)}>Reject</Button>
        <Button asChild variant="ghost" size="icon" className="size-11" aria-label="Call"><a href={`tel:${r.phone}`}><Phone className="size-5" /></a></Button>
        <Button asChild variant="ghost" size="icon" className="size-11" aria-label="WhatsApp"><a href={waLink(r.phone, `Hi ${r.name}, this is ${tenant.name} about your request.`)} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-5" /></a></Button>
      </div>
      <Dialog open={approving} onOpenChange={setApproving}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve {r.name}</DialogTitle><DialogDescription>Pick a plan{tenant.type === "hostel" ? " and a room" : ""}. They get a notification and can set up their ID card.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Plan</Label>
              <ToggleGroup type="single" variant="outline" value={plan || plans.data?.find((p) => p.is_default)?.id || ""} onValueChange={(v) => v && setPlan(v)} className="flex-wrap justify-start">
                {plans.data?.map((p) => <ToggleGroupItem key={p.id} value={p.id} className="h-11 px-3">{p.name} · {formatRupees(p.price_paise)}</ToggleGroupItem>)}
              </ToggleGroup></div>
            {tenant.type === "hostel" && (
              <div className="space-y-2"><Label>Room</Label>
                <Select value={room} onValueChange={setRoom}><SelectTrigger className="h-11 w-full"><SelectValue placeholder="Assign later" /></SelectTrigger>
                  <SelectContent>{rooms.data?.map((x) => <SelectItem key={x.id} value={x.id} disabled={x.free <= 0}>{x.label} · {x.free > 0 ? `${x.free} free` : "full"}</SelectItem>)}</SelectContent></Select></div>
            )}
          </div>
          <DialogFooter><Button className="h-11" onClick={approve}>Approve</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <NoteDialog open={rejecting} onOpenChange={setRejecting} title={`Reject ${r.name}?`} chips={REJECT_CHIPS}
        onSubmit={async (note) => { try { await api.decideRequest(r.id, "reject", { note }); toast.success("Request rejected"); setRejecting(false); refresh() } catch (e) { showActionError(e) } }} />
    </article>
  )
}

/** Reason picker: chips first (tap, don't type), free text only if needed. */
function NoteDialog({ open, onOpenChange, title, chips, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; chips: string[]; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState("")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>The person sees this reason.</DialogDescription></DialogHeader>
        <div className="flex flex-wrap gap-2">{chips.map((c) => <Button key={c} variant={note === c ? "default" : "outline"} className="h-10 rounded-full" onClick={() => setNote(c)}>{c}</Button>)}</div>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Or write a short reason" maxLength={300} />
        <DialogFooter><Button className="h-11" disabled={!note.trim()} onClick={() => onSubmit(note.trim())}>Send</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
