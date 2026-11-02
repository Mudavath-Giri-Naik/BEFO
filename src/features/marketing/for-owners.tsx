import { BedDouble, Camera, ClipboardCheck, IndianRupee, ReceiptText, UsersRound, Wallet } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { formatRupees } from "@/lib/money"
import { usePageMeta } from "@/lib/meta"

const PAINS = [
  { icon: UsersRound, title: "Customers", body: "Students request to join from your page. You approve with one tap; their ID card is ready on their phone." },
  { icon: Wallet, title: "Money in", body: "People pay your UPI directly and tap “I paid”. You confirm. Dues and reminders are worked out for you." },
  { icon: ReceiptText, title: "Money out", body: "Photograph a bill or a UPI screenshot. It becomes a draft expense; you confirm with one tap." },
  { icon: ClipboardCheck, title: "Team", body: "Everyone is present unless you mark an absence. Salaries are calculated on payday." },
  { icon: BedDouble, title: "Your public page", body: "Rooms, prices, today's menu and free beds — always in sync with your own records." },
]

export default function ForOwnersPage() {
  const { t } = useTranslation()
  usePageMeta({ title: t("owners.title") })
  return (
    <>
      <section className="border-b bg-ink-soft/50">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <h1 className="max-w-[20ch] text-4xl leading-tight font-extrabold text-balance sm:text-5xl">{t("owners.title")}</h1>
          <p className="mt-4 max-w-[60ch] text-lg text-muted-foreground">{t("owners.subtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-6"><Link to="/list-your-place">{t("owners.cta")}</Link></Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6"><Link to="/demo">{t("owners.demo")}</Link></Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{t("owners.pilot")}</p>
        </div>
      </section>
      <LeakCalculator />
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold sm:text-3xl">What it takes off your plate</h2>
        <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {PAINS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4"><Icon className="mt-1 size-7 shrink-0 text-primary" aria-hidden />
              <div><h3 className="text-lg font-bold">{title}</h3><p className="mt-1 text-muted-foreground">{body}</p></div></div>
          ))}
          <div className="flex gap-4"><Camera className="mt-1 size-7 shrink-0 text-primary" aria-hidden />
            <div><h3 className="text-lg font-bold">Photograph your register</h3><p className="mt-1 text-muted-foreground">Already have a notebook of names and dates? Take photos of the pages. We turn them into a list you check before saving.</p></div></div>
        </div>
      </section>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xl font-bold">{t("owners.pilot")} No card needed.</p>
          <Button asChild size="lg" variant="secondary" className="h-12"><Link to="/list-your-place">{t("owners.cta")}</Link></Button>
        </div>
      </section>
    </>
  )
}

/** Illustrative only — the copy says so. All maths in paise via formatRupees. */
function LeakCalculator() {
  const [members, setMembers] = useState(120)
  const [fee, setFee] = useState(3000)
  const [hours, setHours] = useState(1.5)
  const [late, setLate] = useState(20)
  const hoursYear = Math.round(hours * 365 * 0.7) // we estimate 70% of book-keeping time goes away
  const lostPaise = Math.round(members * (late / 100) * fee * 100 * 0.1 * 12) // assume 10% of late money is never collected
  return (
    <section className="border-b bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">How much is the notebook costing you?</h2>
          <p className="mt-2 text-muted-foreground">Move the sliders. This is a rough estimate to start a conversation, not a promise.</p>
          <div className="mt-8 space-y-7">
            <Field label="Members" value={members} set={setMembers} min={10} max={500} step={10} />
            <div className="space-y-2">
              <Label htmlFor="fee">Monthly fee (₹)</Label>
              <Input id="fee" inputMode="numeric" value={fee} onChange={(e) => setFee(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))} className="h-12 max-w-40 text-lg" />
            </div>
            <Field label="Hours a day on the book" value={hours} set={setHours} min={0} max={4} step={0.5} />
            <Field label="People who pay late (%)" value={late} set={setLate} min={0} max={60} step={5} />
          </div>
        </div>
        <div className="flex flex-col justify-center gap-6 rounded-2xl border-2 border-dashed border-primary/30 p-6">
          <div><p className="text-sm text-muted-foreground">Time you could get back each year</p><p className="font-display text-5xl font-extrabold tabular-nums">{hoursYear} hours</p></div>
          <div><p className="text-sm text-muted-foreground">Late money that is never collected, per year</p><p className="font-display text-5xl font-extrabold text-destructive tabular-nums">{formatRupees(lostPaise)}</p></div>
          <p className="text-xs text-muted-foreground"><IndianRupee className="inline size-3" aria-hidden /> Assumes 70% of book-keeping time is saved and 10% of late payments are never recovered.</p>
        </div>
      </div>
    </section>
  )
}

function Field({ label, value, set, min, max, step }: { label: string; value: number; set: (n: number) => void; min: number; max: number; step: number }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between"><Label>{label}</Label><span className="font-semibold tabular-nums">{value}</span></div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={(v) => set(v[0])} aria-label={label} />
    </div>
  )
}
