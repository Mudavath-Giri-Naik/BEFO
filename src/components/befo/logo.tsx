import { Link } from "react-router"
import { brand } from "@/app/brand"
import { cn } from "@/lib/utils"

/** Mark: a 2×2 bed board — three beds taken, one free (the violet ring). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6", className)}>
      <circle cx="7" cy="7" r="4.2" className="fill-current" />
      <circle cx="17" cy="7" r="4.2" className="fill-current" />
      <circle cx="7" cy="17" r="4.2" className="fill-current" />
      <circle cx="17" cy="17" r="3.3" fill="none" strokeWidth="1.9" className="stroke-brand" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", className)} aria-label={`${brand.name} home`}>
      <LogoMark />
      <span className="text-[22px] font-medium tracking-tight">{brand.name}</span>
    </Link>
  )
}
