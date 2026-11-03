import { Accordion as AccordionPrimitive } from "radix-ui"
import {
  ArrowDown, BadgeCheck, BedDouble, BellRing, Camera, Check, ChefHat, ClipboardCheck, FileSpreadsheet, Globe, IndianRupee, Languages, Lock,
  MessageCircleWarning, NotebookPen, QrCode, ReceiptText, ScrollText, ShieldCheck, Smartphone, Sparkles, TrendingUp, Truck, UserPlus, Users, Wallet, X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router"
import { brand } from "@/app/brand"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { CtaPill } from "@/components/site/cta"
import { Eyebrow, Reveal, Words } from "@/components/site/reveal"
import { formatRupees } from "@/lib/money"
import { usePageMeta } from "@/lib/meta"
import { cn } from "@/lib/utils"
import { DashboardMock } from "./dashboard-mock"
import { PILOT, perMonthPaise, SOON, TIERS, yearlySavingPaise, type Billing } from "./pricing"

const START = "/list-your-place"

/** Home = the product site for owners of messes, hostels, PGs and tiffin services. Students use /explore. */
export default function HomePage() {
  usePageMeta({ title: "Run your mess, hostel or PG in 10 minutes a week", description: "Members, fees, expenses and staff salaries for messes, hostels, PGs and tiffin services, in one simple app. Free during the pilot." })
  useHashScroll()
  return (
    <>
      <Hero />
      <BuiltFor />
      <Problems />
      <Features />
      <Solutions />
      <LeakCalculator />
      <HowItWorks />
      <Pricing />
      <Trust />
      <Faq />
      <FinalCta />
    </>
  )
}

/** /#pricing etc. from another page: jump to the section, re-checking while the page finishes laying out. */
function useHashScroll() {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    let tries = 0
    let settled = 0
    const id = setInterval(() => {
      const el = document.getElementById(hash.slice(1))
      if (!el || ++tries > 30) return clearInterval(id)
      const top = Math.round(el.getBoundingClientRect().top + window.scrollY - 96)
      if (Math.abs(window.scrollY - top) < 2) { if (++settled >= 3) clearInterval(id); return }
      settled = 0
      window.scrollTo(0, top) // a plain jump; Lenis follows native scroll position
    }, 100)
    return () => clearInterval(id)
  }, [hash])
}

function SectionHead({ eyebrow, title, body, center, light }: { eyebrow: string; title: string; body?: string; center?: boolean; light?: boolean }) {
  return (
    <div className={cn(center && "mx-auto text-center", "max-w-[760px]")}>
      <Reveal><Eyebrow light={light}>{eyebrow}</Eyebrow></Reveal>
      <Words text={title} className={cn("mt-4 text-[34px] leading-[1.08] tracking-[-0.03em] sm:text-[52px]", center && "mx-auto")} />
      {body && <Reveal delay={0.1}><p className={cn("mt-5 text-[17px] leading-relaxed sm:text-[19px]", light ? "text-footer-foreground/70" : "text-muted-foreground", center && "mx-auto max-w-[56ch]")}>{body}</p></Reveal>}
    </div>
  )
}

/* ───────────────────────── Hero ───────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-[120px] sm:pt-[150px]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(60%_50%_at_50%_0%,var(--brand-soft),transparent_70%)]" />
      <div className="mx-auto flex max-w-[920px] flex-col items-center text-center">
        <Reveal onLoad delay={0.05}>
          <Link to="#pricing" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-foreground/12 bg-background/60 py-1 pr-4 pl-1.5 text-[14px] backdrop-blur sm:text-[15px]">
            <span className="rounded-full bg-brand px-2.5 py-1 text-[12px] font-semibold text-white">Pilot</span>
            Free for {PILOT.freeDays} days<span className="max-sm:hidden"> · {PILOT.region}</span>
          </Link>
        </Reveal>
        <Words as="h1" onLoad delay={0.15} text="Run your mess, hostel or PG in 10 minutes a week"
          className="mt-7 max-w-[15ch] text-[40px] leading-[1.04] tracking-[-0.04em] sm:max-w-[17ch] sm:text-[64px] lg:max-w-[19ch] lg:text-[76px]" />
        <Reveal onLoad delay={0.55}>
          <p className="mx-auto mt-6 max-w-[54ch] text-[17px] leading-relaxed text-muted-foreground sm:text-[20px]">
            Members, fees, expenses and staff salaries in one simple app. Know who paid, who's due and what you really earned,
            without the notebook, the calculator or chasing people on WhatsApp.
          </p>
        </Reveal>
        <Reveal onLoad delay={0.7} className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <CtaPill to={START} className="w-full justify-start sm:w-auto">Start free</CtaPill>
          <Link to="/demo" className="inline-flex h-[54px] w-full items-center justify-center rounded-full border border-foreground/15 bg-background/60 px-7 text-[17px] backdrop-blur transition-colors hover:bg-card sm:h-[62px] sm:w-auto">See the live demo</Link>
        </Reveal>
        <Reveal onLoad delay={0.8}>
          <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[14px] text-muted-foreground">
            {["No card needed", "Set up in 10 minutes", "Telugu & English", "Works on any phone"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5"><Check className="size-4 text-leaf" aria-hidden />{t}</li>
            ))}
          </ul>
        </Reveal>
      </div>
      <Reveal onLoad delay={0.95} y={48} className="mx-auto mt-14 max-w-[1120px] sm:mt-20">
        <DashboardMock />
      </Reveal>
    </section>
  )
}

/* ───────────────────────── Built for ───────────────────────── */

const KINDS = [
  [ChefHat, "Messes"], [BedDouble, "Boys hostels"], [ShieldCheck, "Girls hostels"], [Users, "PGs & co-living"], [Truck, "Tiffin services"], [ClipboardCheck, "Student canteens"],
] as const

function BuiltFor() {
  const row = [...KINDS, ...KINDS]
  return (
    <section className="py-14 sm:py-20" aria-label="Built for">
      <Reveal><p className="text-center text-[15px] text-muted-foreground">Built for the places students live and eat</p></Reveal>
      <div className="mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <ul className="befo-marquee flex w-max gap-3" style={{ ["--speed" as string]: "40s" }}>
          {row.map(([Icon, label], i) => (
            <li key={i} aria-hidden={i >= KINDS.length} className="inline-flex h-12 items-center gap-2.5 rounded-full border border-foreground/12 bg-card/50 px-5 text-[16px] whitespace-nowrap">
              <Icon className="size-5 text-brand" strokeWidth={1.7} />{label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ───────────────────────── Problems ───────────────────────── */

const PROBLEMS = [
  { icon: NotebookPen, pain: "A notebook that only you understand", fix: "Every member, plan and due date in one list that works it out for you." },
  { icon: MessageCircleWarning, pain: "Chasing people for fees on WhatsApp", fix: "Polite reminders go out on time. People pay your UPI and tap “I paid”." },
  { icon: ReceiptText, pain: "Bills stuffed in a drawer", fix: "Photograph a bill. It becomes an expense draft you confirm with one tap." },
  { icon: Wallet, pain: "“Did he pay or not?” arguments", fix: "Every rupee has a date, a method and a receipt your member can see." },
  { icon: IndianRupee, pain: "Salary maths at the end of the month", fix: "Absences in, salaries out, worked out to the rupee on payday." },
  { icon: TrendingUp, pain: "No idea what you actually earned", fix: "Profit for the month, what you spent where, and what's coming next." },
]

function Problems() {
  return (
    <section className="px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px]">
        <SectionHead eyebrow="Sound familiar?" title="Running a place shouldn't feel like a second job" body="Most owners lose an hour a day to registers, reminders and receipts, and still don't know exactly who owes what. That's the part we take away." />
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map(({ icon: Icon, pain, fix }, i) => (
            <Reveal key={pain} delay={(i % 3) * 0.06}>
              <div className="h-full rounded-[24px] border border-foreground/10 bg-card/60 p-5 sm:p-6">
                <Icon className="size-6 text-muted-foreground max-sm:hidden sm:size-7" strokeWidth={1.6} aria-hidden />
                <p className="flex items-start gap-2 text-[16px] text-muted-foreground line-through decoration-destructive/60 sm:mt-5 sm:text-[17px]"><X className="mt-1 size-4 shrink-0 text-destructive no-underline" aria-hidden />{pain}</p>
                <p className="mt-2 flex items-start gap-2 text-[17px] leading-snug sm:mt-3 sm:text-[18px]"><Check className="mt-1 size-4 shrink-0 text-leaf" aria-hidden />{fix}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Features (bento) ───────────────────────── */

function Features() {
  return (
    <section id="features" className="scroll-mt-24 bg-muted/40 px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px]">
        <SectionHead eyebrow="Features" title="Everything your place needs. Nothing it doesn't." body="Customers, money in, money out and your team, connected, so a payment updates the due date, the profit and the member's receipt at once." />
        <div className="mt-12 grid gap-3 md:grid-cols-6">
          <Bento className="md:col-span-4" icon={Users} title="Members & join requests"
            body="Students request a seat from your QR poster or public page. Approve with the room and plan on one screen, and their digital ID card is ready on their phone.">
            <MiniList rows={[["Suresh M. wants a seat", "Approve"], ["Kiran T. · Room 204", "Paid up"], ["Anil V. · due in 3 days", "Remind"]]} />
          </Bento>
          <Bento className="md:col-span-2" icon={BellRing} title="Fees that collect themselves"
            body="Reminders before, on and after the due date, in your words. People pay your UPI; you just confirm.">
            <div className="mt-5 rounded-2xl bg-background p-4 text-[14px]"><p className="text-muted-foreground">To 4 members</p><p className="mt-1">Hi Anil, your mess fee of ₹3,000 is due on 6 Nov. Pay to sri.vijaya@upi with note VJ-042. Thank you!</p></div>
          </Bento>
          <Bento soon className="md:col-span-2" icon={Camera} title="Expenses from a photo"
            body="Snap a bill or UPI screenshot. We read the amount, shop and category and make a draft. Nothing is saved until you say so.">
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-background p-4 text-[14px]"><Sparkles className="size-5 shrink-0 text-brand" /><span><b className="font-semibold">Vegetables · ₹4,250</b><br /><span className="text-muted-foreground">Rythu Bazaar · 92% sure</span></span></div>
          </Bento>
          <Bento soon className="md:col-span-2" icon={ClipboardCheck} title="Staff & salaries"
            body="Everyone is present unless you mark an absence. Advances, bonuses and part months are worked out on payday.">
            <div className="mt-5 rounded-2xl bg-background p-4 text-[14px]"><p className="flex justify-between"><span>Cook · Ramesh</span><b className="font-semibold tabular-nums">₹14,000</b></p><p className="mt-1 flex justify-between text-muted-foreground"><span>1 absence · advance ₹2,000</span><span className="tabular-nums">₹11,533</span></p></div>
          </Bento>
          <Bento soon className="md:col-span-2" icon={TrendingUp} title="Profit you can trust"
            body="Income, expenses and profit every month, cost per member, and a CA-ready pack when it's time to file.">
            <div className="mt-5 flex items-end gap-1.5 rounded-2xl bg-background p-4" aria-hidden>
              {[40, 55, 48, 66, 72, 90].map((h, i) => <span key={i} className={cn("flex-1 rounded", i === 5 ? "bg-leaf" : "bg-leaf/30")} style={{ height: `${h * 0.6}px` }} />)}
            </div>
          </Bento>
          <Bento className="md:col-span-3" icon={Globe} title="A public page that fills seats"
            body="Your rooms, prices, today's menu and free beds, always in sync with your own records. Students find you, compare and request to join. No brokers.">
            <div className="mt-5 flex flex-wrap gap-2 text-[13px]">{["3 beds free today", "Veg & non-veg", "₹6,500 / month", "Near GMR college"].map((c) => <span key={c} className="rounded-full bg-background px-3 py-1.5">{c}</span>)}</div>
          </Bento>
          <Bento soon className="md:col-span-3" icon={FileSpreadsheet} title="Start from your notebook"
            body="Already have a register or an Excel sheet? Photograph the pages or upload the file. We turn it into a member list you check before saving.">
            <div className="mt-5 flex items-center gap-3 text-[14px]"><span className="rounded-2xl bg-background px-4 py-3">📒 12 pages</span><ArrowDown className="size-4 -rotate-90 text-muted-foreground" /><span className="rounded-2xl bg-background px-4 py-3"><b className="font-semibold">84 members</b> ready to check</span></div>
          </Bento>
        </div>
      </div>
    </section>
  )
}

function Soon({ light }: { light?: boolean }) {
  return <span className={cn("ml-2 inline-flex h-5 items-center rounded-full px-2 align-middle text-[11px] font-semibold tracking-normal", light ? "bg-primary-foreground/15" : "bg-turmeric-soft text-foreground")}>Soon</span>
}

function Bento({ icon: Icon, title, body, children, className, soon }: { icon: typeof Users; title: string; body: string; children?: React.ReactNode; className?: string; soon?: boolean }) {
  return (
    <Reveal className={className}>
      <div className="flex h-full flex-col rounded-[24px] border border-foreground/10 bg-card p-6 sm:p-7">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong"><Icon className="size-5" strokeWidth={1.8} /></span>
        <h3 className="mt-5 text-[21px] leading-tight tracking-[-0.015em]">{title}{soon && <Soon />}</h3>
        <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">{body}</p>
        <div className="mt-auto">{children}</div>
      </div>
    </Reveal>
  )
}

function MiniList({ rows }: { rows: [string, string][] }) {
  return (
    <ul className="mt-5 divide-y divide-foreground/8 rounded-2xl bg-background px-4 text-[14px]">
      {rows.map(([a, b]) => <li key={a} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0 truncate">{a}</span><span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[12px] font-semibold">{b}</span></li>)}
    </ul>
  )
}

/* ───────────────────────── Solutions ───────────────────────── */

const SOLUTIONS = {
  mess: { label: "Mess", icon: ChefHat, title: "For messes", points: ["Monthly, weekly or per-meal plans", "The week's menu on your public page", "Seat count that updates itself", "Grocery, gas and vegetable costs from bill photos", "Cost per plate and profit every month"] },
  hostel: { label: "Hostel / PG", icon: BedDouble, title: "For hostels & PGs", points: ["Rooms, floors and beds with live availability", "Rent from the previous due date, deposits tracked", "Girls' hostels keep the address private until you accept", "Check-ins, check-outs and room changes in a tap", "Electricity, rent and housekeeping in your P&L"] },
  tiffin: { label: "Tiffin", icon: Truck, title: "For tiffin services", points: ["Subscribers with pause and resume", "Today's menu shared with one link", "Delivery and packaging costs tracked", "Reminders before every renewal", "Know which plans actually make money"] },
} as const
type SolutionKey = keyof typeof SOLUTIONS

function Solutions() {
  const [tab, setTab] = useState<SolutionKey>("mess")
  const s = SOLUTIONS[tab]
  return (
    <section id="solutions" className="scroll-mt-24 px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px]">
        <SectionHead eyebrow="Solutions" title="Set up for the way your place works" body="Pick your type of business and the app arranges itself: the right labels, categories, plans and screens from day one." />
        <div role="tablist" aria-label="Business type" className="mt-10 grid w-full grid-cols-3 gap-1 rounded-full border border-foreground/12 p-1 sm:inline-flex sm:w-auto">
          {(Object.keys(SOLUTIONS) as SolutionKey[]).map((k) => {
            const S = SOLUTIONS[k]
            return (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={cn("inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full px-2 text-[14px] font-medium whitespace-nowrap transition-colors sm:px-5 sm:text-[15px]", tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                <S.icon className="size-4 shrink-0 max-[400px]:hidden" />{S.label}
              </button>
            )
          })}
        </div>
        <div role="tabpanel" className="mt-6 grid gap-6 rounded-[28px] border border-foreground/10 bg-card p-6 sm:p-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <div>
            <s.icon className="size-10 text-brand" strokeWidth={1.5} aria-hidden />
            <h3 className="mt-4 text-[30px] leading-tight tracking-[-0.025em] sm:text-[38px]">{s.title}</h3>
            <div className="mt-6"><CtaPill to={START} size="md">Start free</CtaPill></div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {s.points.map((p) => <li key={p} className="flex items-start gap-3 rounded-2xl bg-background p-4 text-[16px] leading-snug"><Check className="mt-0.5 size-5 shrink-0 text-leaf" aria-hidden />{p}</li>)}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Leak calculator (FOMO) ───────────────────────── */

/** Illustrative only, and the copy says so. All money via formatRupees. */
function LeakCalculator() {
  const [members, setMembers] = useState(120)
  const [fee, setFee] = useState(3000)
  const [hours, setHours] = useState(1.5)
  const [late, setLate] = useState(20)
  const hoursYear = Math.round(hours * 365 * 0.7) // we estimate 70% of book-keeping time goes away
  const lostPaise = Math.round(members * (late / 100) * fee * 100 * 0.1 * 12) // assume 10% of late money is never collected
  return (
    <section className="bg-footer px-4 py-20 text-footer-foreground sm:py-28">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHead light eyebrow="What the notebook costs you" title="Every month on paper is money you don't get back" />
          <p className="mt-4 text-[15px] text-footer-foreground/60">Move the sliders. A rough estimate to start a conversation, not a promise.</p>
          <div className="mt-8 space-y-7">
            <CalcField label="Members" value={members} set={setMembers} min={10} max={500} step={10} />
            <div className="space-y-2">
              <Label htmlFor="fee" className="text-footer-foreground">Monthly fee (₹)</Label>
              <Input id="fee" inputMode="numeric" value={fee} onChange={(e) => setFee(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))}
                className="h-12 max-w-40 border-white/15 bg-white/5 text-lg text-footer-foreground" />
            </div>
            <CalcField label="Hours a day on registers & reminders" value={hours} set={setHours} min={0} max={4} step={0.5} />
            <CalcField label="People who pay late (%)" value={late} set={setLate} min={0} max={60} step={5} />
          </div>
        </div>
        <div className="flex flex-col justify-center gap-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 sm:p-10">
          <div><p className="text-[15px] text-footer-foreground/60">Late fees you never collect, per year</p><p className="mt-1 text-[48px] leading-none tracking-[-0.04em] text-[#ff8a7a] tabular-nums sm:text-[64px]">{formatRupees(lostPaise)}</p></div>
          <div><p className="text-[15px] text-footer-foreground/60">Hours you could get back, per year</p><p className="mt-1 text-[48px] leading-none tracking-[-0.04em] tabular-nums sm:text-[64px]">{hoursYear} hrs</p></div>
          <p className="text-[13px] text-footer-foreground/50">Assumes 70% of book-keeping time is saved and 10% of late payments are never recovered.</p>
          <CtaPill to={START} light size="md" className="self-start">Stop the leak</CtaPill>
        </div>
      </div>
    </section>
  )
}

function CalcField({ label, value, set, min, max, step }: { label: string; value: number; set: (n: number) => void; min: number; max: number; step: number }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-3 text-footer-foreground"><Label>{label}</Label><span className="font-semibold tabular-nums">{value}</span></div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={(v) => set(v[0])} aria-label={label} />
    </div>
  )
}

/* ───────────────────────── How it works ───────────────────────── */

const STEPS = [
  { icon: UserPlus, title: "Apply in 3 taps", body: "Tell us what you run, its name and your usual fee. We check every place and approve it, usually within a day." },
  { icon: Camera, title: "Bring your register", body: "Photograph your notebook or upload your Excel. Print your QR poster so students can join on their own." },
  { icon: ScrollText, title: "10 minutes a week", body: "Once a week, confirm what's waiting: payments, join requests, bills. Everything else runs by itself." },
]

function HowItWorks() {
  return (
    <section className="px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px]">
        <SectionHead center eyebrow="How it works" title="From notebook to dashboard this week" />
        <ol className="mt-12 grid gap-3 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} as="li" delay={i * 0.08}>
              <div className="h-full rounded-[24px] border border-foreground/10 bg-card/60 p-6 sm:p-7">
                <div className="flex items-center justify-between"><span className="text-[44px] leading-none tracking-[-0.04em] text-muted-foreground/40 tabular-nums">0{i + 1}</span><Icon className="size-7 text-brand" strokeWidth={1.6} aria-hidden /></div>
                <h3 className="mt-6 text-[22px] tracking-[-0.015em]">{title}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ───────────────────────── Pricing ───────────────────────── */

function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly")
  return (
    <section id="pricing" className="scroll-mt-24 bg-muted/40 px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px]">
        <SectionHead center eyebrow="Pricing" title="Less than one member's monthly fee" body={PILOT.note} />
        <div className="mt-8 flex justify-center">
          <div role="radiogroup" aria-label="Billing" className="inline-flex rounded-full border border-foreground/12 bg-background p-1">
            {(["monthly", "yearly"] as const).map((b) => (
              <button key={b} type="button" role="radio" aria-checked={billing === b} onClick={() => setBilling(b)}
                className={cn("inline-flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-medium transition-colors", billing === b ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                <span className="capitalize">{b}</span>{b === "yearly" && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", billing === b ? "bg-primary-foreground/15" : "bg-leaf-soft text-leaf")}>2 months free</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3 lg:items-stretch">
          {TIERS.map((t, i) => (
            <Reveal key={t.id} delay={i * 0.07}>
              <div className={cn("relative flex h-full flex-col rounded-[28px] border p-6 sm:p-8", t.popular ? "border-primary bg-primary text-primary-foreground shadow-2xl lg:-my-3 lg:py-11" : "border-foreground/10 bg-card")}>
                {t.popular && <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[12px] font-semibold text-white">Most popular</span>}
                <h3 className="text-[22px] tracking-[-0.015em]">{t.name}</h3>
                <p className={cn("mt-1 text-[15px]", t.popular ? "text-primary-foreground/70" : "text-muted-foreground")}>{t.blurb}</p>
                <p className="mt-6 flex items-end gap-1.5">
                  <span className="text-[44px] leading-none tracking-[-0.04em] tabular-nums sm:text-[52px]">{formatRupees(perMonthPaise(t, billing))}</span>
                  <span className={cn("pb-1.5 text-[15px]", t.popular ? "text-primary-foreground/70" : "text-muted-foreground")}>/ month</span>
                </p>
                <p className={cn("mt-2 min-h-5 text-[13px]", t.popular ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {billing === "yearly" ? `Billed yearly · you save ${formatRupees(yearlySavingPaise(t))}` : "Billed monthly · cancel any time"}
                </p>
                <p className={cn("mt-5 rounded-2xl px-4 py-3 text-[14px]", t.popular ? "bg-primary-foreground/10" : "bg-background")}>
                  Up to <b className="font-semibold">{t.members} members</b> · {t.places === 1 ? "1 place" : `${t.places} places`} · {t.staffLogins} staff {t.staffLogins === 1 ? "login" : "logins"}
                </p>
                <ul className="mt-6 space-y-3 text-[15px]">
                  {t.features.map((f) => <li key={f} className="flex items-start gap-2.5"><Check className={cn("mt-0.5 size-4 shrink-0", t.popular ? "text-primary-foreground" : "text-leaf")} aria-hidden /><span>{f}{SOON.has(f) && <Soon light={t.popular} />}</span></li>)}
                </ul>
                <div className="mt-auto pt-8">
                  <Link to={START} className={cn("flex h-12 w-full items-center justify-center rounded-full text-[16px] font-medium transition-opacity hover:opacity-90", t.popular ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground")}>
                    Start {PILOT.freeDays} days free
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-center text-[14px] leading-relaxed text-muted-foreground">Features marked <Soon /> are rolling out during the pilot. Prices exclude GST. More than 500 members or 3 places? <a href={brand.supportEmail ? `mailto:${brand.supportEmail}` : "/help"} className="underline underline-offset-4 hover:text-foreground">Talk to us</a>.</p>
      </div>
    </section>
  )
}

/* ───────────────────────── Trust ───────────────────────── */

const TRUST = [
  { icon: Lock, title: "Your data stays yours", body: "Each business is walled off from every other one, checked by hundreds of automatic tests on every change." },
  { icon: BadgeCheck, title: "Nothing changes without you", body: "Automation only makes drafts. Payments, bills and salaries are saved when you tap confirm." },
  { icon: ScrollText, title: "Every change is recorded", body: "Who confirmed what, and when. Voids need a reason. Disputes end in seconds." },
  { icon: Smartphone, title: "Made for your phone", body: "Big buttons, works on slow networks, installs like an app. No laptop needed." },
  { icon: Languages, title: "Telugu & English", body: "Switch the app between Telugu and English any time, on any screen." },
  { icon: QrCode, title: "Members need nothing new", body: "They join by scanning your poster and pay the UPI they already use." },
]

function Trust() {
  return (
    <section className="px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px]">
        <SectionHead eyebrow="Built to be trusted" title="Serious about your money, simple for your staff" />
        <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={(i % 3) * 0.05} className="flex gap-4">
              <Icon className="mt-1 size-6 shrink-0 text-brand" strokeWidth={1.7} aria-hidden />
              <div><h3 className="text-[19px] tracking-[-0.01em]">{title}</h3><p className="mt-1 text-[16px] leading-relaxed text-muted-foreground">{body}</p></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── FAQ ───────────────────────── */

const FAQS: [string, string][] = [
  ["Do I need a computer or any training?", "No. Everything works on your phone, and the screens show only what needs your answer. Most owners are set up in about 10 minutes."],
  ["My members are already in a notebook. Do I type them all in?", "No. Photograph the pages or upload your Excel. We turn it into a list; you check it once and save."],
  ["Do payments go through your app?", "No. Members keep paying your UPI, cash or bank directly, so there are no fees and no waiting. They tap “I paid” and you confirm, or you mark cash in two taps."],
  ["Why do you approve new places?", "So students only ever see real, checked businesses. You apply in 3 taps and we usually approve within a day. Nothing is created until then."],
  ["What happens after the free period?", `You pick a plan. If you don't, nothing is deleted: your records stay safe until you decide. The pilot runs in ${PILOT.region}.`],
  ["Can my manager use it without seeing the money?", "Yes. Managers handle members, requests and attendance; money totals stay hidden unless you allow them."],
]

function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 bg-muted/40 px-4 py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
        <div>
          <SectionHead eyebrow="FAQ" title="Questions owners ask us" />
          <Reveal delay={0.1} className="mt-8"><CtaPill to="/demo" size="md">Try the demo</CtaPill></Reveal>
        </div>
        <AccordionPrimitive.Root type="single" collapsible className="space-y-3">
          {FAQS.map(([q, a], i) => (
            <Reveal key={q} delay={i * 0.04}>
              <AccordionPrimitive.Item value={q} className="overflow-hidden rounded-[24px] border border-foreground/12 bg-card/40 transition-colors data-[state=open]:bg-card">
                <AccordionPrimitive.Header>
                  <AccordionPrimitive.Trigger className="group flex min-h-[68px] w-full items-center justify-between gap-4 px-6 py-4 text-left text-[18px] leading-snug tracking-[-0.01em] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:text-[20px]">
                    {q}
                    <ArrowDown className="size-5 shrink-0 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-data-[state=open]:rotate-180" strokeWidth={1.6} />
                  </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>
                <AccordionPrimitive.Content className="overflow-hidden text-[16px] leading-relaxed text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <p className="px-6 pb-6">{a}</p>
                </AccordionPrimitive.Content>
              </AccordionPrimitive.Item>
            </Reveal>
          ))}
        </AccordionPrimitive.Root>
      </div>
    </section>
  )
}

/* ───────────────────────── Final CTA ───────────────────────── */

function FinalCta() {
  return (
    <section className="px-4 py-20 sm:py-28">
      <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[32px] bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12 sm:py-24">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_0%,color-mix(in_oklab,var(--brand)_45%,transparent),transparent_70%)]" />
        <div className="relative">
          <Words text="The places students choose next are going digital now" className="mx-auto max-w-[18ch] text-[34px] leading-[1.08] tracking-[-0.03em] sm:text-[56px]" />
          <Reveal delay={0.1}><p className="mx-auto mt-5 max-w-[48ch] text-[17px] text-primary-foreground/75 sm:text-[19px]">Pilot owners get {PILOT.freeDays} days free and a say in what we build next. Apply today and be set up this week.</p></Reveal>
          <Reveal delay={0.2} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={START} className="inline-flex h-[54px] w-full items-center justify-center rounded-full bg-primary-foreground px-8 text-[17px] font-medium text-primary transition-opacity hover:opacity-90 sm:h-[60px] sm:w-auto">Start free</Link>
            <Link to="/demo" className="inline-flex h-[54px] w-full items-center justify-center rounded-full border border-primary-foreground/25 px-8 text-[17px] transition-colors hover:bg-primary-foreground/10 sm:h-[60px] sm:w-auto">See the live demo</Link>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
