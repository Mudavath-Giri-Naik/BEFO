import { useEffect } from "react"
import { brand } from "@/app/brand"

/** Client-side title/description. Server-side meta for /p/:slug is injected by functions/p/[slug].ts. */
export function usePageMeta({ title, description }: { title?: string; description?: string }) {
  useEffect(() => {
    document.title = title ? `${title} · ${brand.name}` : brand.name
    if (description) document.querySelector('meta[name="description"]')?.setAttribute("content", description)
  }, [title, description])
}
