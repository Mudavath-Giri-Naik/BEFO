import { z } from "zod"

/**
 * Frontend environment. Fails fast with a clear message (shown full-screen by main.tsx).
 * VITE_DATA_SOURCE=demo runs the public site on built-in demo data with no Supabase project,
 * so the UI can be tried before Gate G2. Anything that needs a login requires "supabase".
 */
const schema = z.object({
  VITE_APP_NAME: z.string().min(1, "Set VITE_APP_NAME (the product name, decided at Gate G0)."),
  VITE_APP_URL: z.url("Set VITE_APP_URL, e.g. http://localhost:5173 (no trailing slash)."),
  VITE_DATA_SOURCE: z.enum(["supabase", "demo"]).default("supabase"),
  VITE_SUPABASE_URL: z.string().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().optional(),
  VITE_SUPPORT_WHATSAPP: z.string().regex(/^\d{10,15}$/, "VITE_SUPPORT_WHATSAPP: digits only with country code").optional().or(z.literal("")),
  VITE_SUPPORT_EMAIL: z.email().optional().or(z.literal("")),
  VITE_TURNSTILE_SITE_KEY: z.string().optional(),
  VITE_VAPID_PUBLIC_KEY: z.string().optional(),
  VITE_MAP_TILE_URL: z.string().default("https://tile.openstreetmap.org/{z}/{x}/{y}.png"),
  VITE_SENTRY_DSN: z.string().optional(),
}).superRefine((v, ctx) => {
  if (v.VITE_DATA_SOURCE === "supabase") {
    if (!v.VITE_SUPABASE_URL) ctx.addIssue({ code: "custom", path: ["VITE_SUPABASE_URL"], message: "Set VITE_SUPABASE_URL (Supabase → Project Settings → API → Project URL), or set VITE_DATA_SOURCE=demo to try the site without a backend." })
    if (!v.VITE_SUPABASE_ANON_KEY) ctx.addIssue({ code: "custom", path: ["VITE_SUPABASE_ANON_KEY"], message: "Set VITE_SUPABASE_ANON_KEY (Supabase → Project Settings → API → anon / publishable key)." })
  }
})

export type Env = z.infer<typeof schema>

export function readEnv(): { ok: true; env: Env } | { ok: false; errors: string[] } {
  const raw = Object.fromEntries(Object.entries(import.meta.env).map(([k, v]) => [k, v === "" ? undefined : v]))
  const r = schema.safeParse(raw)
  if (r.success) return { ok: true, env: r.data }
  return { ok: false, errors: r.error.issues.map((i) => i.message) }
}

const parsed = readEnv()
export const envErrors = parsed.ok ? [] : parsed.errors
export const env: Env = parsed.ok
  ? parsed.env
  : ({ VITE_APP_NAME: "App", VITE_APP_URL: "http://localhost:5173", VITE_DATA_SOURCE: "demo", VITE_MAP_TILE_URL: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" } as Env)
export const isDemoData = env.VITE_DATA_SOURCE === "demo"
