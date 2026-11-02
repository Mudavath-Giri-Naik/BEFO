import { ArrowUpRight } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"
import { cn } from "@/lib/utils"

/**
 * The pill button: dark pill, a white circle on the left with an arrow, label on the right.
 * `light` is the inverse for dark sections. The arrow turns and the circle grows on hover.
 */
export function CtaPill({ to, href, onClick, children, light, size = "lg", className }: {
  to?: string; href?: string; onClick?: () => void; children: ReactNode; light?: boolean; size?: "md" | "lg"; className?: string
}) {
  const cls = cn(
    "group relative inline-flex items-center rounded-full font-medium whitespace-nowrap outline-none transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(.22,1,.36,1)] focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98]",
    size === "lg" ? "h-[54px] gap-4 p-[4px] pr-7 text-[17px] sm:h-[62px] sm:pr-8 sm:text-[19px]" : "h-[50px] gap-3 p-[4px] pr-6 text-[16px]",
    light ? "bg-footer-foreground text-footer" : "bg-primary text-primary-foreground",
    className,
  )
  const circle = (
    <span className={cn("relative flex shrink-0 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.06]",
      size === "lg" ? "size-[46px] sm:size-[54px]" : "size-[42px]",
      light ? "bg-footer text-footer-foreground" : "bg-primary-foreground text-primary")}>
      <ArrowUpRight className="size-[18px] transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:rotate-45" strokeWidth={1.75} />
    </span>
  )
  if (to) return <Link to={to} className={cls}>{circle}<span>{children}</span></Link>
  if (href) return <a href={href} className={cls}>{circle}<span>{children}</span></a>
  return <button type="button" onClick={onClick} className={cls}>{circle}<span>{children}</span></button>
}
