import { placePhotoUrl } from "@/lib/supabase"
import type { BusinessType } from "@/lib/data/types"
import { cn } from "@/lib/utils"

/**
 * Cover image, or — when the owner hasn't added photos yet — a drawn cover that says what the
 * place is: a room board for hostels, a steel thali for messes, a stacked carrier for tiffins.
 */
export function PlaceCover({ path, type, alt, seed = 0, className }: { path?: string | null; type: BusinessType; alt?: string; seed?: number; className?: string }) {
  const url = placePhotoUrl(path)
  if (url) return <img src={url} alt={alt ?? ""} loading="lazy" decoding="async" className={cn("size-full object-cover", className)} />
  return (
    <div className={cn("relative size-full overflow-hidden", type === "hostel" ? "bg-ink-soft" : type === "tiffin" ? "bg-leaf-soft" : "bg-turmeric-soft", className)} aria-hidden>
      {type === "hostel" ? <BedsArt seed={seed} /> : type === "tiffin" ? <TiffinArt /> : <ThaliArt />}
    </div>
  )
}

function BedsArt({ seed }: { seed: number }) {
  const cells = Array.from({ length: 18 }, (_, i) => ((i * 7 + seed * 5) % 11 === 0 ? "free" : "taken"))
  return (
    <svg viewBox="0 0 300 180" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
      {cells.map((c, i) => {
        const x = 40 + (i % 6) * 44, y = 40 + Math.floor(i / 6) * 50
        return c === "free"
          ? <circle key={i} cx={x} cy={y} r="13" fill="none" strokeWidth="5" className="stroke-leaf" />
          : <circle key={i} cx={x} cy={y} r="15" className="fill-primary/20" />
      })}
    </svg>
  )
}

function ThaliArt() {
  return (
    <svg viewBox="0 0 300 180" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
      <circle cx="150" cy="96" r="78" className="fill-card" />
      <circle cx="150" cy="96" r="78" fill="none" strokeWidth="3" className="stroke-turmeric/60" />
      <circle cx="150" cy="112" r="30" className="fill-turmeric/25" />
      {[[105, 64], [150, 46], [195, 64], [214, 108]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="17" className="fill-background" />
          <circle cx={x} cy={y} r="17" fill="none" strokeWidth="2.5" className="stroke-turmeric/70" />
          <circle cx={x} cy={y} r="10" className={i % 2 ? "fill-leaf/40" : "fill-turmeric/60"} />
        </g>
      ))}
    </svg>
  )
}

function TiffinArt() {
  return (
    <svg viewBox="0 0 300 180" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
      <path d="M118 46 q32 -30 64 0" fill="none" strokeWidth="6" className="stroke-leaf/60" />
      {[52, 86, 120].map((y) => <rect key={y} x="106" y={y} width="88" height="30" rx="9" className="fill-card stroke-leaf/60" strokeWidth="3" />)}
    </svg>
  )
}
