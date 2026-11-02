import { cn } from "@/lib/utils"

export type Bed = "taken" | "free" | "blocked"
export interface BoardRoom { label: string; beds: Bed[] }

/**
 * The room board: each room is a tile, each bed a dot. Filled = taken, green ring = free,
 * dashed = blocked. Used in the hero, place pages and (later) the owner's Rooms screen.
 * `animate` lights the free beds up once on mount (off under prefers-reduced-motion).
 */
export function RoomBoard({ rooms, animate = false, size = "md", className }: { rooms: BoardRoom[]; animate?: boolean; size?: "sm" | "md"; className?: string }) {
  let freeIndex = 0
  return (
    <div className={cn("grid gap-2", size === "sm" ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-4", className)} role="img"
      aria-label={`${rooms.reduce((n, r) => n + r.beds.filter((b) => b === "free").length, 0)} free beds in ${rooms.length} rooms`}>
      {rooms.map((r) => (
        <div key={r.label} className="rounded-lg border bg-card px-2 pt-1.5 pb-2">
          <div className="text-[11px] font-semibold text-muted-foreground tabular-nums">{r.label}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {r.beds.map((b, i) => {
              const delay = b === "free" ? 250 + 140 * freeIndex++ : 0
              return (
                <span key={i}
                  style={animate && b === "free" ? { animationDelay: `${delay}ms` } : undefined}
                  className={cn("rounded-full", size === "sm" ? "size-3" : "size-4",
                    b === "taken" && "bg-primary/85",
                    b === "free" && "bg-leaf-soft ring-2 ring-leaf ring-inset",
                    b === "free" && animate && "animate-in zoom-in-50 fade-in fill-mode-both duration-500",
                    b === "blocked" && "border border-dashed border-muted-foreground/50")} />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
