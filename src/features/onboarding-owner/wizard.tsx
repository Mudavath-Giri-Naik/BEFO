import { useQuery } from "@tanstack/react-query"
import { Check, Loader2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { brand } from "@/app/brand"
import { parseIndianAmount, formatRupees } from "@/lib/money"
import { usePageMeta } from "@/lib/meta"
import { slugify, validateSlug } from "@/lib/slug"
import { supabase } from "@/lib/supabase"

type Type = "mess" | "hostel" | "tiffin" | "other"
const TYPES: { v: Type; label: string; hint: string }[] = [
  { v: "mess", label: "Mess", hint: "Monthly meals" },
  { v: "hostel", label: "Hostel / PG", hint: "Rooms and beds" },
  { v: "tiffin", label: "Tiffin", hint: "Boxes delivered" },
  { v: "other", label: "Other", hint: "Anything else" },
]
const CITIES = ["Vizianagaram", "Visakhapatnam", "Srikakulam", "Vijayawada", "Guntur", "Hyderabad"]
const ERR: Record<string, string> = {
  slug_taken: "That web address is taken. Try another.", rate_limited: "You've created several places today. Try again tomorrow.",
  phone_not_verified: "Verify your mobile number first.",
}

/** /list-your-place: 3 short steps, mostly taps (§16, zero-work rule 5). Rooms, photos and menu come after, inside the app. */
export default function ListYourPlace() {
  usePageMeta({ title: "List your place" })
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [type, setType] = useState<Type | "">("")
  const [audience, setAudience] = useState("any")
  const [name, setName] = useState("")
  const [customSlug, setCustomSlug] = useState<string | null>(null)
  const slug = customSlug ?? slugify(name)
  const [city, setCity] = useState("")
  const [price, setPrice] = useState("")
  const [busy, setBusy] = useState(false)

  const slugError = slug ? validateSlug(slug) : null
  const [debounced, setDebounced] = useState(slug)
  useEffect(() => { const id = setTimeout(() => setDebounced(slug), 400); return () => clearTimeout(id) }, [slug])
  const avail = useQuery({
    queryKey: ["slug", debounced], enabled: !!supabase && !!debounced && !validateSlug(debounced), staleTime: 30_000,
    queryFn: async () => (await supabase!.rpc("slug_available", { p_slug: debounced })).data as boolean,
  })
  const pricePaise = price ? parseIndianAmount(price) : null

  const canNext = [!!type, name.trim().length >= 2 && !slugError && avail.data === true && city.trim().length > 1, true][step]

  const create = async () => {
    if (!supabase || !type) return
    setBusy(true)
    const { data, error } = await supabase.rpc("create_tenant", {
      p_name: name.trim(), p_slug: slug, p_type: type, p_city: city.trim(), p_audience: type === "hostel" ? audience : "any",
      p_plan_name: type === "hostel" ? "Monthly rent" : "Monthly", p_plan_price_paise: pricePaise != null ? Number(pricePaise) : null,
    })
    setBusy(false)
    if (error) return toast.error(ERR[error.message] ?? error.message)
    toast.success(`${name} is set up`)
    nav(`/app/${(data as { slug: string }).slug}`, { replace: true })
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Progress value={((step + 1) / 3) * 100} className="h-2" aria-label={`Step ${step + 1} of 3`} />
      <p className="mt-3 text-sm text-muted-foreground">Step {step + 1} of 3 · free during the pilot</p>

      {step === 0 && (
        <section className="mt-6 space-y-6">
          <h1 className="text-3xl font-bold">What do you run?</h1>
          <div className="grid grid-cols-2 gap-3">
            {TYPES.map((t) => (
              <button key={t.v} type="button" onClick={() => setType(t.v)} aria-pressed={type === t.v}
                className={`flex min-h-24 flex-col items-start justify-center rounded-xl border-2 p-4 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${type === t.v ? "border-primary bg-ink-soft" : "bg-card"}`}>
                <span className="text-lg font-bold">{t.label}</span><span className="text-sm text-muted-foreground">{t.hint}</span>
              </button>
            ))}
          </div>
          {type === "hostel" && (
            <div className="space-y-2"><Label>Who is it for?</Label>
              <ToggleGroup type="single" variant="outline" value={audience} onValueChange={(v) => v && setAudience(v)} className="flex-wrap justify-start">
                {[["boys", "Boys"], ["girls", "Girls"], ["coed", "Co-living"], ["any", "Anyone"]].map(([v, l]) => <ToggleGroupItem key={v} value={v} className="h-11 px-4">{l}</ToggleGroupItem>)}
              </ToggleGroup>
              {(audience === "girls" || audience === "coed") && <p className="text-sm text-muted-foreground">For safety, your exact address and phone stay hidden until you accept someone.</p>}
            </div>
          )}
        </section>
      )}

      {step === 1 && (
        <section className="mt-6 space-y-5">
          <h1 className="text-3xl font-bold">Name and place</h1>
          <div className="space-y-2"><Label htmlFor="pname">Name of your {type === "hostel" ? "hostel" : type === "mess" ? "mess" : "place"}</Label>
            <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-lg" autoComplete="organization" /></div>
          <div className="space-y-2"><Label htmlFor="slug">Web address</Label>
            <div className="flex items-center rounded-md border bg-card pl-3 focus-within:ring-[3px] focus-within:ring-ring/50">
              <span className="shrink-0 text-sm text-muted-foreground">{brand.url.replace(/^https?:\/\//, "")}/p/</span>
              <Input id="slug" value={slug} onChange={(e) => setCustomSlug(e.target.value.toLowerCase())} className="h-12 border-0 shadow-none focus-visible:ring-0" autoCapitalize="none" spellCheck={false} />
              <span className="pr-3" aria-live="polite">
                {slug && (slugError || avail.data === false) ? <X className="size-5 text-destructive" aria-label="Not available" />
                  : avail.isFetching ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : avail.data ? <Check className="size-5 text-leaf" aria-label="Available" /> : null}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{slugError ?? (avail.data === false ? "Taken. Try another." : "This can't be changed later.")}</p>
          </div>
          <div className="space-y-2"><Label htmlFor="city">City or town</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="h-12" list="cities" autoComplete="address-level2" />
            <datalist id="cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
            <div className="flex flex-wrap gap-2">{CITIES.slice(0, 3).map((c) => <Button key={c} type="button" variant="outline" className="h-9 rounded-full" onClick={() => setCity(c)}>{c}</Button>)}</div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="mt-6 space-y-5">
          <h1 className="text-3xl font-bold">{type === "hostel" ? "Usual monthly rent" : "Monthly price"}</h1>
          <p className="text-muted-foreground">{type === "hostel" ? "You'll add room types with their own prices next. This is the default plan." : "Your main monthly plan. You can add more plans later."}</p>
          <div className="space-y-2"><Label htmlFor="price">Amount (₹ per month)</Label>
            <Input id="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={type === "hostel" ? "6500" : "3000"} className="h-14 font-display text-2xl" />
            {price && pricePaise === null && <p className="text-sm text-destructive">Enter a number, like 3000.</p>}
            {pricePaise != null && <p className="text-sm text-muted-foreground">{formatRupees(pricePaise)} per month</p>}
          </div>
          <p className="text-sm text-muted-foreground">You can skip this and set prices later.</p>
        </section>
      )}

      <div className="mt-10 flex gap-3">
        {step > 0 && <Button variant="outline" className="h-12 flex-1" onClick={() => setStep(step - 1)}>Back</Button>}
        {step < 2
          ? <Button className="h-12 flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>Next</Button>
          : <Button className="h-12 flex-1" disabled={busy || (!!price && pricePaise === null)} onClick={create}>{busy ? "Setting up…" : "Create my place"}</Button>}
      </div>
    </div>
  )
}
