import Lenis from "lenis"
import { useEffect } from "react"
import { useLocation } from "react-router"

let lenis: Lenis | null = null
export const getLenis = () => lenis

/**
 * Calm, eased page scrolling (wheel / trackpad). Touch keeps native momentum on phones.
 * Off when the visitor prefers reduced motion.
 */
export function SmoothScroll() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true, anchors: { offset: -96 } })
    let id = 0
    const raf = (t: number) => { lenis?.raf(t); id = requestAnimationFrame(raf) }
    id = requestAnimationFrame(raf)
    return () => { cancelAnimationFrame(id); lenis?.destroy(); lenis = null }
  }, [])
  useEffect(() => {
    if (location.hash) return
    if (lenis) lenis.scrollTo(0, { immediate: true })
    else window.scrollTo(0, 0)
  }, [pathname])
  return null
}
