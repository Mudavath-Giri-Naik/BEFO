import { Banknote, BedDouble, Camera, Check, Home, Inbox, LayoutGrid, MessageCircle, ReceiptText, TrendingUp, UserPlus, Users } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { formatRupees } from "@/lib/money"
import { cn } from "@/lib/utils"
import { EASE } from "@/components/site/reveal"

// Example numbers for an illustrative mess with ~85 members. Shown with an "Example data" label.
const MONTHS: [string, number][] = [["Jun", 42], ["Jul", 55], ["Aug", 63], ["Sep", 72], ["Oct", 89], ["Nov", 100]]
const r = (rupees: number) => formatRupees(BigInt(rupees) * 100n)

/** The owner's Today screen, drawn in real UI (not a screenshot) so it is sharp, themed and responsive. */
export function DashboardMock() {
  const reduce = useReducedMotion()
  return (
    <div className="relative">
      {/* floating toasts (desktop only) */}
      <Float className="top-16 -left-6 hidden lg:flex" delay={1.4}>
        <span className="flex size-9 items-center justify-center rounded-full bg-leaf-soft text-leaf"><Banknote className="size-4" /></span>
        <span><b className="block text-[14px] font-semibold">{r(3000)} received</b><span className="text-[12px] text-muted-foreground">Ravi K. · UPI · just now</span></span>
      </Float>
      <Float className="-right-6 bottom-24 hidden lg:flex" delay={1.7}>
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand-strong"><MessageCircle className="size-4" /></span>
        <span><b className="block text-[14px] font-semibold">4 reminders sent</b><span className="text-[12px] text-muted-foreground">WhatsApp · written for you</span></span>
      </Float>

      <div className="overflow-hidden rounded-[22px] border border-foreground/10 bg-background shadow-[0_40px_120px_-40px_rgba(20,20,40,0.45)] sm:rounded-[28px]">
        {/* window bar */}
        <div className="flex h-10 items-center gap-2 border-b border-foreground/8 bg-card px-4">
          <span className="flex gap-1.5" aria-hidden>{["bg-destructive/70", "bg-turmeric", "bg-leaf"].map((c) => <span key={c} className={cn("size-2.5 rounded-full", c)} />)}</span>
          <span className="mx-auto hidden h-6 items-center rounded-full bg-muted px-4 text-[11px] text-muted-foreground sm:flex">befo · Sri Vijaya Mess · Today</span>
          <span className="ml-auto rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand-strong sm:ml-0">Example data</span>
        </div>

        <div className="flex text-left">
          {/* sidebar */}
          <aside className="hidden w-48 shrink-0 border-r border-foreground/8 bg-card/60 p-3 md:block" aria-hidden>
            <p className="px-2 pt-1 text-[11px] text-muted-foreground">Owner</p>
            <p className="px-2 text-[15px] font-semibold">Sri Vijaya Mess</p>
            <nav className="mt-4 space-y-1 text-[13px]">
              {[[Home, "Today", true], [Inbox, "Inbox", false, 3], [Users, "Members"], [BedDouble, "Rooms"], [Banknote, "Money"], [LayoutGrid, "More"]].map(([Icon, label, active, n]) => {
                const I = Icon as typeof Home
                return (
                  <span key={label as string} className={cn("flex h-9 items-center gap-2.5 rounded-lg px-2.5 font-medium", active ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                    <I className="size-4" />{label as string}{n ? <span className="ml-auto rounded-full bg-destructive px-1.5 text-[10px] text-white">{n as number}</span> : null}
                  </span>
                )
              })}
            </nav>
          </aside>

          {/* main */}
          <div className="min-w-0 flex-1 space-y-3 p-3 sm:space-y-4 sm:p-5">
            <div className="flex items-end justify-between gap-2">
              <div><p className="text-[11px] text-muted-foreground sm:text-[12px]">Monday, 3 Nov</p><p className="text-[18px] leading-tight font-semibold sm:text-[22px]">Today</p></div>
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-leaf-soft px-2.5 text-[11px] font-semibold text-leaf"><TrendingUp className="size-3.5" />+12% vs Oct</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
              <Kpi label="Collected this month" value={r(246000)} sub="82 of 85 paid" />
              <Kpi label="Still to collect" value={r(9000)} sub="3 overdue" tone="bad" />
              <Kpi label="Spent this month" value={r(174600)} sub="18 bills, all from photos" />
              <Kpi label="Profit so far" value={r(71400)} sub="29% margin" tone="good" />
            </div>

            <div className="grid gap-2 sm:gap-3 lg:grid-cols-[1.15fr_1fr]">
              <div className="rounded-xl border border-foreground/8 bg-card p-3 sm:p-4">
                <div className="flex items-center justify-between"><p className="text-[12px] font-semibold sm:text-[13px]">Fees collected</p><p className="text-[11px] text-muted-foreground">last 6 months</p></div>
                <div className="mt-3 flex h-24 items-end gap-2 sm:h-32 sm:gap-3" aria-hidden>
                  {MONTHS.map(([m, h], i) => (
                    <div key={m} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                      <motion.div className={cn("w-full rounded-md", i === MONTHS.length - 1 ? "bg-brand" : "bg-brand/25")}
                        initial={reduce ? false : { height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }}
                        transition={{ duration: 0.9, ease: EASE, delay: 0.3 + i * 0.07 }} style={reduce ? { height: `${h}%` } : undefined} />
                      <span className="text-[10px] text-muted-foreground">{m}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-foreground/8 bg-card p-3 sm:p-4">
                <div className="flex items-center justify-between"><p className="text-[12px] font-semibold sm:text-[13px]">Needs your answer</p><span className="rounded-full bg-destructive px-1.5 text-[10px] text-white">3</span></div>
                <ul className="mt-2 divide-y divide-foreground/8">
                  <Task icon={Banknote} title="Ravi K. says he paid" sub={`${r(3000)} · UPI ref matches`} action="Confirm" />
                  <Task icon={UserPlus} title="Join request · Suresh M." sub="Wants a seat from 10 Nov" action="Approve" />
                  <Task icon={Camera} title="Vegetable bill" sub={`${r(4250)} · read from a photo`} action="Save" className="max-sm:hidden" />
                </ul>
              </div>
            </div>

            <div className="hidden items-center gap-3 rounded-xl border border-foreground/8 bg-card p-3 sm:flex sm:p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-turmeric-soft"><ReceiptText className="size-4" /></span>
              <p className="min-w-0 flex-1 text-[13px]"><b className="font-semibold">Salaries on 1 Dec:</b> 6 people · {r(52400)} worked out from attendance</p>
              <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-foreground/8 bg-card p-2.5 sm:p-3.5">
      <p className="text-[10px] leading-tight text-muted-foreground sm:text-[12px]">{label}</p>
      <p className={cn("mt-1 text-[16px] leading-none font-semibold tabular-nums sm:text-[22px]", tone === "bad" && "text-destructive", tone === "good" && "text-leaf")}>{value}</p>
      <p className="mt-1 truncate text-[10px] text-muted-foreground sm:text-[11px]">{sub}</p>
    </div>
  )
}

function Task({ icon: Icon, title, sub, action, className }: { icon: typeof Home; title: string; sub: string; action: string; className?: string }) {
  return (
    <li className={cn("flex items-center gap-2.5 py-2", className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted"><Icon className="size-4" /></span>
      <span className="min-w-0 flex-1"><b className="block truncate text-[12px] font-semibold sm:text-[13px]">{title}</b><span className="block truncate text-[11px] text-muted-foreground">{sub}</span></span>
      <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground"><Check className="size-3" />{action}</span>
    </li>
  )
}

function Float({ children, className, delay }: { children: React.ReactNode; className?: string; delay: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div className={cn("absolute z-10 items-center gap-3 rounded-2xl border border-foreground/10 bg-popover/95 py-2.5 pr-5 pl-2.5 shadow-xl backdrop-blur", className)}
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, ease: EASE, delay }}
      aria-hidden>
      {children}
    </motion.div>
  )
}
