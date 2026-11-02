import { env } from "./env"

/** Never hard-code the product name: always read it from here. */
export const brand = {
  name: env.VITE_APP_NAME,
  url: env.VITE_APP_URL,
  supportWhatsApp: env.VITE_SUPPORT_WHATSAPP || "",
  supportEmail: env.VITE_SUPPORT_EMAIL || "",
}

/** The 8 contrast-checked tenant swatches (used only on cards and the place header). */
export const TENANT_SWATCHES = {
  indigo: { bg: "#26307a", fg: "#ffffff" },
  leaf: { bg: "#1d6b3f", fg: "#ffffff" },
  turmeric: { bg: "#f2b705", fg: "#2a1f00" },
  brick: { bg: "#a4372b", fg: "#ffffff" },
  teal: { bg: "#0f6a6e", fg: "#ffffff" },
  plum: { bg: "#6b2d6b", fg: "#ffffff" },
  slate: { bg: "#38415c", fg: "#ffffff" },
  ocean: { bg: "#1557a0", fg: "#ffffff" },
} as const
export type TenantSwatch = keyof typeof TENANT_SWATCHES
