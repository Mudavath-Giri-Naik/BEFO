import { Link } from "react-router"
import { brand } from "@/app/brand"
import { cn } from "@/lib/utils"

/** Mark: a 2×2 bed board with one free bed. Name always comes from VITE_APP_NAME. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <circle cx="11" cy="11" r="4" className="fill-primary-foreground" />
      <circle cx="21" cy="11" r="4" className="fill-primary-foreground" />
      <circle cx="11" cy="21" r="4" className="fill-primary-foreground" />
      <circle cx="21" cy="21" r="3.2" fill="none" strokeWidth="1.8" className="stroke-turmeric" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", className)} aria-label={`${brand.name} home`}>
      <LogoMark />
      <span className="font-display text-xl font-extrabold tracking-tight">{brand.name}</span>
    </Link>
  )
}
