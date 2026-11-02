import { Accordion as AccordionPrimitive } from "radix-ui"
import { AirVent, ArrowDown, ArrowUpRight, BedDouble, Cctv, ChefHat, Droplets, Flame, IndianRupee, Leaf, MapPin, ShieldCheck, Shirt, SlidersHorizontal, UserRoundX, UtensilsCrossed, Wifi, Zap } from "lucide-react"
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react"
import { useRef } from "react"
import { Link } from "react-router"
import { brand } from "@/app/brand"
import { LogoMark } from "@/components/befo/logo"
import { PlaceCard } from "@/components/befo/place-card"
import { CtaPill } from "@/components/site/cta"
import { Laurel } from "@/components/site/laurel"
import { photo, photoSet, type PhotoKey } from "@/components/site/media"
import { EASE, Eyebrow, Reveal, Words } from "@/components/site/reveal"
import { usePlaces, useStats } from "@/lib/data"
import { usePageMeta } from "@/lib/meta"
import { cn } from "@/lib/utils"

export default function HomePage() {
  usePageMeta({ title: "Hostels, PGs and messes with real seats and real prices" })
  return (
    <>
      <Hero />
      <Intro />
      <PromiseCard />
      <Marquees />
      <Kinds />
      <Highlights />
      <Filters />
      <OpenNow />
      <Faq />
      <Pricing />
      <Owners />
    </>
  )
}

/* ───────────────────────── Hero ───────────────────────── */

function Hero() {
  const stats = useStats()
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1.12, 1])
  return (
    <section className="relative px-4 pt-[132px] sm:pt-[160px]">
      <div className="mx-auto flex max-w-[860px] flex-col items-center text-center">
        <Reveal onLoad delay={0.05}>
          <span className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/12 px-5 text-[15px] text-muted-foreground sm:text-base">
            <MapPin className="size-[18px]" strokeWidth={1.6} aria-hidden />Vizianagaram · Visakhapatnam
          </span>
        </Reveal>
        <Words as="h1" onLoad delay={0.15} text="Find your next stay, near your college"
          className="mt-7 max-w-[13ch] text-[40px] leading-[1.06] tracking-[-0.035em] sm:max-w-[16ch] sm:text-[64px] lg:text-[76px]" />
        <Reveal onLoad delay={0.55} className="mt-6 flex items-center gap-3">
          <span className="flex -space-x-2.5" aria-hidden>
            {([BedDouble, UtensilsCrossed, ShieldCheck] as const).map((Icon, i) => (
              <span key={i} className="flex size-9 items-center justify-center rounded-full border-2 border-background bg-card shadow-sm"><Icon className="size-4" strokeWidth={1.6} /></span>
            ))}
          </span>
          <span className="text-[16px] text-muted-foreground sm:text-[17px]">Hostels, PGs, messes & tiffins</span>
        </Reveal>
        <Reveal onLoad delay={0.7} className="mt-10"><CtaPill to="/explore">Find a place</CtaPill></Reveal>
      </div>

      <Reveal onLoad delay={0.85} className="mx-auto mt-16 max-w-[520px] px-2 sm:mt-20">
        <div className="grid h-[104px] grid-cols-2 items-center rounded-[28px] border border-foreground/12">
          <div className="flex items-center justify-center gap-1.5">
            <Laurel className="h-11 w-auto" />
            <span className="text-center text-[17px] leading-tight">Owner<br />listed</span>
            <Laurel flip className="h-11 w-auto" />
          </div>
          <div className="text-center">
            <p className="text-[28px] leading-none tabular-nums">{stats.data ? stats.data.beds_free : "—"}</p>
            <p className="mt-1.5 text-[14px] text-muted-foreground">beds free today</p>
          </div>
        </div>
      </Reveal>

      <Reveal onLoad delay={1} y={40} className="mx-auto mt-4 max-w-[1240px]">
        <div ref={ref} className="relative aspect-[4/3.7] overflow-hidden rounded-[32px] sm:aspect-[16/8.5] sm:rounded-[40px]">
          <motion.img style={{ scale }} src={photo("brightRoom", 1600)} srcSet={photoSet("brightRoom")} sizes="(min-width: 1240px) 1240px, 100vw"
            alt="A bright, clean shared room with beds made up" fetchPriority="high" className="absolute inset-0 size-full object-cover" />
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-[14px] font-medium text-[#171717] shadow-lg backdrop-blur sm:bottom-6 sm:left-6">
            <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-leaf opacity-60 motion-reduce:hidden" /><span className="relative size-2.5 rounded-full bg-leaf" /></span>
            Seats update from the owner's register
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ───────────────────────── Intro (dark photo + stats card) ───────────────────────── */

function Intro() {
  const stats = useStats()
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-8%", "8%"])
  const s = stats.data
  const items = [
    { v: s ? `${s.places}` : "—", l: "Places listed by the people who run them" },
    { v: s ? `${s.beds_free}` : "—", l: "Beds free today, counted from real rooms" },
    { v: "₹0", l: "Brokerage. Talk to the owner directly" },
  ]
  return (
    <section ref={ref} className="relative mt-24 overflow-hidden sm:mt-32">
      <motion.img style={{ y }} src={photo("loveseat", 1800)} alt="" loading="lazy" className="absolute inset-x-0 top-[-8%] h-[116%] w-full object-cover" />
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative mx-auto max-w-[1200px] px-6 pt-20 pb-16 sm:px-8 sm:pt-28 sm:pb-24">
        <Reveal><Eyebrow light>Introduction</Eyebrow></Reveal>
        <Words text="Every hostel, PG and mess in your city, in one honest place" className="mt-5 max-w-[17ch] text-[34px] leading-[1.1] text-white sm:text-[56px]" />
        <Reveal y={60} className="mt-[30vh] sm:mt-[38vh]">
          <ul className="grid rounded-[32px] bg-card px-6 sm:grid-cols-3 sm:px-0">
            {items.map((x, i) => (
              <li key={x.l} className={cn("py-8 sm:px-10 sm:py-12", i > 0 && "border-t border-foreground/12 sm:border-t-0 sm:border-l")}>
                <p className="text-[56px] leading-none tracking-[-0.04em] tabular-nums sm:text-[72px]">{x.v}</p>
                <p className="mt-4 max-w-[18ch] text-[19px] leading-snug">{x.l}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}

/* ───────────────────────── Promise (host-card style) ───────────────────────── */

function PromiseCard() {
  return (
    <section className="mx-auto max-w-[860px] px-6 py-24 text-center sm:py-32">
      <Reveal className="inline-flex items-center gap-4 rounded-[28px] border border-foreground/12 py-3.5 pr-4 pl-3.5 text-left">
        <span className="relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <LogoMark className="size-7" />
          <span className="absolute right-0 bottom-0.5 size-3 rounded-full border-2 border-background bg-leaf" />
        </span>
        <span className="pr-4">
          <span className="block text-[18px] font-medium">The {brand.name} promise</span>
          <span className="block text-[16px] text-muted-foreground">For every listing</span>
        </span>
        <span className="flex size-11 items-center justify-center rounded-full border border-foreground/12"><ShieldCheck className="size-[18px]" strokeWidth={1.6} /></span>
      </Reveal>
      <Words as="p" text="“If a place says a bed is free, it's free. Rent, deposit and today's menu come straight from the owner. No brokers, no surprises.”"
        className="mx-auto mt-10 max-w-[30ch] text-[24px] leading-[1.4] text-muted-foreground sm:text-[30px]" />
    </section>
  )
}

/* ───────────────────────── Marquees ───────────────────────── */

const ROW_A = [
  { icon: BedDouble, t: "Live free beds" }, { icon: ChefHat, t: "Today's menu" }, { icon: ShieldCheck, t: "Checked listings" },
  { icon: UserRoundX, t: "No brokers" }, { icon: IndianRupee, t: "Fixed prices" },
]
const ROW_B = [
  { icon: MapPin, t: "Near your college" }, { icon: Leaf, t: "Veg & non-veg" }, { icon: ShieldCheck, t: "Girls' hostels kept private" },
  { icon: SlidersHorizontal, t: "Compare side by side" }, { icon: Wifi, t: "Wi-Fi & power backup" },
]

function Marquees() {
  return (
    <section className="space-y-4 overflow-hidden pb-24 sm:pb-32" aria-label="What you get">
      <MarqueeRow items={ROW_A} speed="46s" />
      <MarqueeRow items={ROW_B} speed="52s" reverse />
    </section>
  )
}

function MarqueeRow({ items, speed, reverse }: { items: typeof ROW_A; speed: string; reverse?: boolean }) {
  const all = [...items, ...items]
  return (
    <div className="flex w-max">
      <ul className={cn("befo-marquee flex w-max gap-4 pr-4", reverse && "befo-marquee-reverse")} style={{ ["--speed" as string]: speed }}>
        {[...all, ...all].map((x, i) => (
          <li key={i} aria-hidden={i >= items.length} className="flex h-[78px] shrink-0 items-center gap-5 rounded-full border border-foreground/12 py-2.5 pr-9 pl-2.5 sm:h-[92px]">
            <span className="flex size-[58px] items-center justify-center rounded-full border border-foreground/10 bg-muted/60 sm:size-[70px]"><x.icon className="size-6" strokeWidth={1.5} /></span>
            <span className="text-[30px] tracking-[-0.03em] whitespace-nowrap sm:text-[40px]">{x.t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ───────────────────────── Kinds of place (stacking cards) ───────────────────────── */

const KINDS: { n: string; title: string; sub: string; to: string; img: PhotoKey }[] = [
  { n: "01", title: "Boys hostels", sub: "Shared and single rooms, food included", to: "/explore?type=hostel&audience=boys", img: "woodBunks" },
  { n: "02", title: "Girls hostels", sub: "Wardens, CCTV, address shared only after you're accepted", to: "/explore?type=hostel&audience=girls", img: "bedWood" },
  { n: "03", title: "Messes", sub: "Monthly meal plans with the week's menu", to: "/explore?type=mess", img: "thaliSteel" },
  { n: "04", title: "PGs & co-living", sub: "Private rooms for working people", to: "/explore?type=hostel&audience=coed", img: "deskBed" },
  { n: "05", title: "Tiffin services", sub: "Lunch boxes delivered on time", to: "/explore?type=tiffin", img: "thali" },
]

function Kinds() {
  return (
    <section className="border-t border-foreground/10 bg-muted/40 pt-24 pb-10 sm:pt-32">
      <div className="mx-auto max-w-[860px] px-6 text-center">
        <Reveal><Eyebrow>Explore</Eyebrow></Reveal>
        <Words text="Every kind of place, near your college" className="mx-auto mt-4 max-w-[16ch] text-[38px] leading-[1.08] sm:text-[56px]" />
        <Reveal delay={0.15} className="mt-8"><CtaPill to="/explore">Find a place</CtaPill></Reveal>
      </div>
      <ul className="mx-auto mt-16 max-w-[1100px] px-6 sm:px-8">
        {KINDS.map((k, i) => (
          <li key={k.n} className="sticky pb-6" style={{ top: `${104 + i * 14}px` }}>
            <Link to={k.to} className="group relative block aspect-[4/4.6] overflow-hidden rounded-[28px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:aspect-[16/8] sm:rounded-[36px]">
              <img src={photo(k.img, 1400)} srcSet={photoSet(k.img)} sizes="(min-width: 1100px) 1100px, 100vw" alt="" loading="lazy"
                className="absolute inset-0 size-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.04]" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <span className="absolute right-6 bottom-6 left-6 flex items-end justify-between gap-4 text-white sm:right-10 sm:bottom-9 sm:left-10">
                <span>
                  <span className="block text-[17px] text-white/80 tabular-nums">{k.n}</span>
                  <span className="mt-1 block text-[32px] leading-tight tracking-[-0.03em] sm:text-[48px]">{k.title}</span>
                  <span className="mt-1 block max-w-[34ch] text-[15px] text-white/80 sm:text-[17px]">{k.sub}</span>
                </span>
                <span className="hidden size-14 shrink-0 items-center justify-center rounded-full bg-white text-[#171717] transition-transform duration-500 group-hover:rotate-45 sm:flex"><ArrowUpRight className="size-5" strokeWidth={1.6} /></span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ───────────────────────── Highlights ───────────────────────── */

const HIGHLIGHTS = [
  { n: "Live", t: "Free beds", s: "Counted from the room register", icon: BedDouble },
  { n: "1", t: "Fixed price", s: "Rent, deposit and food, up front", icon: IndianRupee },
  { n: "7", t: "Day menu", s: "The week's meals from the kitchen", icon: ChefHat },
  { n: "0", t: "Brokers", s: "You talk to the owner directly", icon: UserRoundX },
]

function Highlights() {
  return (
    <section className="mx-auto max-w-[860px] px-6 py-24 sm:py-32">
      <div className="text-center">
        <Reveal><p className="text-[17px]">Features</p></Reveal>
        <Words text="What every listing shows" className="mt-3 text-[38px] leading-[1.1] sm:text-[56px]" />
      </div>
      <ul className="mt-14 space-y-4">
        {HIGHLIGHTS.map((h, i) => (
          <Reveal as="li" key={h.t} delay={i * 0.06}>
            <div className="flex items-center gap-5 rounded-[28px] border border-foreground/12 py-6 pr-6 pl-7 sm:gap-8 sm:py-8 sm:pl-10">
              <span className="w-[1.8ch] shrink-0 text-[40px] leading-none tracking-[-0.04em] tabular-nums sm:text-[52px]">{h.n === "Live" ? <span className="text-leaf">●</span> : h.n}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[24px] leading-tight sm:text-[30px]">{h.t}</span>
                <span className="mt-1 block text-[16px] text-muted-foreground sm:text-[18px]">{h.s}</span>
              </span>
              <span className="flex size-[60px] shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-muted/60 sm:size-[72px]"><h.icon className="size-[22px]" strokeWidth={1.5} /></span>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

/* ───────────────────────── Filters (amenities) ───────────────────────── */

const AMENITY_ROWS = [
  { t: "Fast Wi-Fi", icon: Wifi, q: "amenities=wifi" }, { t: "Hot water", icon: Flame, q: "amenities=geyser" },
  { t: "AC rooms", icon: AirVent, q: "amenities=ac" }, { t: "Laundry", icon: Shirt, q: "amenities=laundry" },
  { t: "CCTV & security", icon: Cctv, q: "amenities=cctv" }, { t: "Power backup", icon: Zap, q: "amenities=power_backup" },
  { t: "RO drinking water", icon: Droplets, q: "amenities=ro_water" }, { t: "Pure veg food", icon: Leaf, q: "veg=veg" },
]

function Filters() {
  return (
    <section className="mx-auto max-w-[860px] px-6 pb-24 sm:pb-32">
      <Reveal className="text-center"><p className="text-[17px]">Filters</p></Reveal>
      <Reveal className="mt-8">
        <div className="flex aspect-[4/2.6] flex-col items-center justify-center rounded-[28px] border border-foreground/12 px-6 text-center sm:aspect-[16/6]">
          <SlidersHorizontal className="size-9" strokeWidth={1.3} />
          <p className="mt-5 max-w-[16ch] text-[28px] leading-tight sm:text-[36px]">Everything students ask before moving in</p>
        </div>
      </Reveal>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {AMENITY_ROWS.map((a, i) => (
          <Reveal as="li" key={a.t} delay={(i % 2) * 0.06}>
            <Link to={`/explore?${a.q}`} className="flex h-[78px] items-center justify-between rounded-[28px] border border-foreground/12 px-7 transition-colors hover:bg-card sm:h-[84px]">
              <span className="text-[22px] tracking-[-0.02em] sm:text-[24px]">{a.t}</span>
              <a.icon className="size-[22px]" strokeWidth={1.5} aria-hidden />
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

/* ───────────────────────── Open right now (live data) ───────────────────────── */

function OpenNow() {
  const featured = usePlaces({ onlyAvailable: true, sort: "beds_free", limit: 6 })
  if (!featured.data?.items.length) return null
  return (
    <section className="pb-24 sm:pb-32">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <div>
          <Reveal><Eyebrow>Open right now</Eyebrow></Reveal>
          <Words text="Places with free beds today" className="mt-4 max-w-[14ch] text-[38px] leading-[1.08] sm:text-[52px]" />
        </div>
        <Reveal delay={0.1}><CtaPill to="/explore?free=1" size="md">See all</CtaPill></Reveal>
      </div>
      <div className="mt-12 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-lenis-prevent-wheel>
        <ul className="flex w-max snap-x snap-mandatory gap-4 px-6 pb-2 sm:px-[max(2rem,calc((100vw-1200px)/2+2rem))]">
          {featured.data.items.map((p, i) => (
            <li key={p.slug} className="w-[82vw] max-w-[360px] shrink-0 snap-start"><PlaceCard place={p} index={i} compare={false} /></li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ───────────────────────── FAQ ───────────────────────── */

const FAQS = [
  ["Is it free for students?", "Yes. Searching, comparing and sending requests is free, and there is no brokerage."],
  ["How do I know the seats are real?", "Free beds are counted from the owner's own room register and show when they were last checked. Old counts are hidden and replaced with “Ask owner”."],
  ["Why do girls' hostels hide the exact address?", "For safety. The full address and phone number are shared only after the owner accepts your request."],
  ["Do I pay through the app?", "No. You pay the owner directly by UPI or cash, then tap “I paid”. The owner confirms it."],
  ["I run a hostel or mess. What does it cost?", "Listing your place and the owner tools are free during the pilot."],
]

function Faq() {
  return (
    <section className="bg-muted/40 py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1100px] gap-12 px-6 sm:px-8 lg:grid-cols-[1fr_1.25fr] lg:gap-20">
        <div>
          <Reveal><Eyebrow>FAQ</Eyebrow></Reveal>
          <Words text="Everything you need to know" className="mt-4 max-w-[12ch] text-[38px] leading-[1.08] sm:text-[52px]" />
          <Reveal delay={0.1} className="mt-8"><CtaPill to="/help" size="md">Ask us</CtaPill></Reveal>
        </div>
        <AccordionPrimitive.Root type="single" collapsible className="space-y-4">
          {FAQS.map(([q, a], i) => (
            <Reveal key={q} delay={i * 0.05}>
              <AccordionPrimitive.Item value={q} className="overflow-hidden rounded-[28px] border border-foreground/12 bg-card/40 transition-colors data-[state=open]:bg-card">
                <AccordionPrimitive.Header>
                  <AccordionPrimitive.Trigger className="group flex min-h-[78px] w-full items-center justify-between gap-4 px-7 py-5 text-left text-[20px] leading-snug tracking-[-0.015em] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:text-[22px]">
                    {q}
                    <ArrowDown className="size-5 shrink-0 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-data-[state=open]:rotate-180" strokeWidth={1.6} />
                  </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>
                <AccordionPrimitive.Content className="overflow-hidden text-[17px] leading-relaxed text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <p className="px-7 pb-7">{a}</p>
                </AccordionPrimitive.Content>
              </AccordionPrimitive.Item>
            </Reveal>
          ))}
        </AccordionPrimitive.Root>
      </div>
    </section>
  )
}

/* ───────────────────────── Pricing (dark) ───────────────────────── */

const STRIP: PhotoKey[] = ["bedsRow", "thali", "linen", "roundTray", "blueBed", "bunks", "chaise"]

function Pricing() {
  return (
    <section className="bg-footer pt-24 text-footer-foreground sm:pt-32">
      <div className="mx-auto max-w-[860px] px-6 text-center">
        <Reveal><p className="text-[17px] text-footer-foreground/80">Pricing</p></Reveal>
        <Words text="₹0 for students" className="mt-4 text-[56px] leading-none tracking-[-0.045em] sm:text-[96px]" />
        <Reveal delay={0.1}><p className="mx-auto mt-6 max-w-[30ch] text-[20px] leading-snug text-footer-foreground/70 sm:text-[22px]">No brokerage, no booking fee. You pay the owner only the rent or mess fee shown.</p></Reveal>
        <Reveal delay={0.2} className="mt-10"><CtaPill to="/explore" light>Find a place</CtaPill></Reveal>
      </div>
      <div className="mt-20 overflow-hidden pb-24 sm:pb-32" aria-hidden>
        <ul className="befo-marquee flex w-max gap-5" style={{ ["--speed" as string]: "60s" }}>
          {[...STRIP, ...STRIP].map((k, i) => (
            <li key={i} className={cn("shrink-0 overflow-hidden rounded-[28px]", i % 2 ? "h-[300px] w-[230px] sm:h-[380px] sm:w-[300px]" : "h-[340px] w-[280px] sm:h-[440px] sm:w-[360px]")}>
              <img src={photo(k, 720)} alt="" loading="lazy" className="size-full object-cover" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ───────────────────────── Owners (dark, flows into the footer) ───────────────────────── */

function Owners() {
  const reduce = useReducedMotion()
  const points = ["Approve join requests in one tap", "People pay your UPI and tap “I paid”; you confirm", "Bills become expense drafts from a photo", "Salaries worked out on payday"]
  return (
    <section className="border-t border-white/10 bg-footer py-24 text-footer-foreground sm:py-32">
      <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-6 sm:px-8 lg:grid-cols-2">
        <div>
          <Reveal><Eyebrow light>For owners</Eyebrow></Reveal>
          <Words text="Run your hostel or mess in ten minutes a week" className="mt-4 max-w-[15ch] text-[38px] leading-[1.08] sm:text-[56px]" />
          <ul className="mt-8 space-y-3">
            {points.map((p, i) => (
              <Reveal as="li" key={p} delay={i * 0.06} className="flex items-center gap-3 text-[18px] text-footer-foreground/80">
                <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden />{p}
              </Reveal>
            ))}
          </ul>
          <Reveal delay={0.2} className="mt-10 flex flex-wrap gap-3">
            <CtaPill to="/list-your-place" light>List your place</CtaPill>
            <Link to="/demo" className="inline-flex h-[54px] items-center rounded-full border border-white/20 px-7 text-[17px] transition-colors hover:bg-white/10 sm:h-[62px]">Try the demo</Link>
          </Reveal>
        </div>
        <motion.div initial={reduce ? false : { opacity: 0, y: 40, rotate: -2 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true, margin: "-10%" }} transition={{ duration: 1, ease: EASE }}
          className="rounded-[32px] bg-card p-5 text-card-foreground sm:p-7" aria-hidden>
          <p className="text-[14px] text-muted-foreground">Today · your mess</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[["Collected this month", "₹2,46,000"], ["Still to collect", "₹9,000"], ["Active members", "82 / 85"], ["Seats open", "18"]].map(([l, v]) => (
              <div key={l} className="rounded-[20px] border border-foreground/10 p-4"><p className="text-[13px] text-muted-foreground">{l}</p><p className="mt-1 text-[24px] tracking-[-0.03em] tabular-nums">{v}</p></div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-[20px] border border-foreground/10 p-4">
            <div><p className="text-[16px]">Chaitanya says he paid</p><p className="text-[13px] text-muted-foreground">UPI · UTR 430918273645</p></div>
            <span className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-[14px] text-primary-foreground">Confirm</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
