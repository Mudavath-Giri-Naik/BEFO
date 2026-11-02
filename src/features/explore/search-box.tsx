import { Building2, Landmark, MapPin, Search } from "lucide-react"
import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useSuggest } from "@/lib/data"
import { cn } from "@/lib/utils"

const TYPES = [
  { v: "all", key: "explore.all" },
  { v: "hostel", key: "types.hostel" },
  { v: "mess", key: "types.mess" },
  { v: "tiffin", key: "types.tiffin" },
] as const

export function SearchBox({ className, defaultQ = "", defaultType = "all" }: { className?: string; defaultQ?: string; defaultType?: string }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [q, setQ] = useState(defaultQ)
  const [type, setType] = useState(defaultType)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const { data: sugg = [] } = useSuggest(q)
  const listId = useId()

  const go = (query: string, city?: string) => {
    const p = new URLSearchParams()
    if (query.trim()) p.set("q", query.trim())
    if (city) p.set("city", city)
    if (type !== "all") p.set("type", type)
    setOpen(false)
    nav(`/explore${p.size ? `?${p}` : ""}`)
  }

  return (
    <form role="search" className={cn("rounded-[28px] border bg-card p-2 shadow-[0_24px_60px_-30px_rgba(26,26,46,0.35)]", className)}
      onSubmit={(e) => { e.preventDefault(); if (active >= 0 && sugg[active]) go(sugg[active].label); else go(q) }}>
      <ToggleGroup type="single" value={type} onValueChange={(v) => v && setType(v)} className="w-full justify-start gap-1 overflow-x-auto p-1" aria-label="Type">
        {TYPES.map((x) => (
          <ToggleGroupItem key={x.v} value={x.v} className="h-9 rounded-full px-4 text-sm font-semibold text-muted-foreground data-[state=on]:bg-brand-soft data-[state=on]:text-brand-strong">
            {t(x.key)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="relative mt-1 flex gap-2">
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-brand" aria-hidden />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1) }}
            onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, sugg.length - 1)) }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)) }
              if (e.key === "Escape") setOpen(false)
            }}
            placeholder={t("home.searchPlaceholder")} aria-label={t("home.searchPlaceholder")}
            role="combobox" aria-expanded={open && sugg.length > 0} aria-controls={listId} aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            className="h-14 rounded-full border-0 bg-muted/60 pl-12 text-base shadow-none focus-visible:bg-card" enterKeyHint="search" autoComplete="off" />
          {open && sugg.length > 0 && (
            <ul id={listId} role="listbox" className="absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-2xl border bg-popover p-1.5 shadow-xl">
              {sugg.map((s, i) => {
                const Icon = s.kind === "city" ? Building2 : s.kind === "landmark" ? Landmark : MapPin
                return (
                  <li key={s.kind + s.label} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                    onMouseDown={(e) => { e.preventDefault(); go(s.kind === "city" ? "" : s.label, s.kind === "city" ? s.city : undefined) }}
                    className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm", i === active ? "bg-accent text-accent-foreground" : "hover:bg-muted")}>
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                    <span className="font-semibold">{s.label}</span>
                    {s.kind !== "city" && <span className="text-muted-foreground">{s.city}</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <Button type="submit" size="lg" className="h-14 rounded-full px-6 text-base" aria-label={t("home.search")}>
          <Search className="size-5" aria-hidden /><span className="hidden sm:inline">{t("home.search")}</span>
        </Button>
      </div>
    </form>
  )
}
