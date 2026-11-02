import { motion, useReducedMotion } from "motion/react"
import type { ElementType, ReactNode } from "react"
import { cn } from "@/lib/utils"

export const EASE = [0.22, 1, 0.36, 1] as const

/** Fades content up (with a touch of blur) the first time it scrolls into view. */
export function Reveal({ children, delay = 0, y = 28, className, as = "div", onLoad = false }: {
  children: ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "li" | "section" | "span"; onLoad?: boolean
}) {
  const reduce = useReducedMotion()
  const M = motion[as] as typeof motion.div
  if (reduce) { const T = as as ElementType; return <T className={className}>{children}</T> }
  const target = { opacity: 1, y: 0, filter: "blur(0px)" }
  return (
    <M className={className} initial={{ opacity: 0, y, filter: "blur(8px)" }}
      {...(onLoad ? { animate: target } : { whileInView: target, viewport: { once: true, margin: "0px 0px -12% 0px" } })}
      transition={{ duration: 0.9, ease: EASE, delay }}>
      {children}
    </M>
  )
}

/** Headline that rises in word by word. */
export function Words({ text, className, delay = 0, as = "h2", onLoad = false }: { text: string; className?: string; delay?: number; as?: "h1" | "h2" | "p"; onLoad?: boolean }) {
  const reduce = useReducedMotion()
  const T = as as ElementType
  if (reduce) return <T className={className}>{text}</T>
  const words = text.split(" ")
  return (
    <T className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden>
          <motion.span className="inline-block" initial={{ y: "105%", opacity: 0 }}
            {...(onLoad ? { animate: { y: "0%", opacity: 1 } } : { whileInView: { y: "0%", opacity: 1 }, viewport: { once: true, margin: "0px 0px -10% 0px" } })}
            transition={{ duration: 0.85, ease: EASE, delay: delay + i * 0.055 }}>
            {w}{i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </T>
  )
}

/** "• Label" eyebrow used above section titles. */
export function Eyebrow({ children, className, light }: { children: ReactNode; className?: string; light?: boolean }) {
  return (
    <p className={cn("inline-flex items-center gap-2.5 text-[15px] sm:text-base", light ? "text-white/85" : "text-muted-foreground", className)}>
      <span className={cn("size-2 rounded-full", light ? "bg-white/60" : "bg-muted-foreground/50")} aria-hidden />{children}
    </p>
  )
}
