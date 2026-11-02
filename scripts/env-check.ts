/**
 * pnpm env:check [--prod]
 * Lists missing / invalid keys grouped by required-for-dev, required-for-prod and optional, with the
 * steps to get each one. Exits 1 if anything required (for the chosen target) is missing or invalid.
 */
import { config } from "dotenv"
import { ENV, type EnvKey } from "./env-spec"

config({ path: process.env.ENV_FILE ?? ".env", quiet: true })
const prod = process.argv.includes("--prod")
const val = (k: string) => (process.env[k] ?? "").trim()

const missing: Record<string, EnvKey[]> = { dev: [], prod: [], feature: [], optional: [] }
const invalid: [EnvKey, string][] = []
for (const k of ENV) {
  const v = val(k.key)
  if (!v) missing[k.need].push(k)
  else if (k.validate) {
    const err = k.validate(v)
    if (err) invalid.push([k, err])
  }
}
if (prod && val("VITE_DATA_SOURCE") === "demo") invalid.push([ENV.find((k) => k.key === "VITE_DATA_SOURCE")!, "must be \"supabase\" in production"])
if (prod && val("SMS_DRIVER") === "console") invalid.push([ENV.find((k) => k.key === "SMS_DRIVER")!, "console prints OTPs to logs; use msg91 in production"])
if (val("VITE_SUPABASE_ANON_KEY").startsWith("sb_secret_")) invalid.push([ENV.find((k) => k.key === "VITE_SUPABASE_ANON_KEY")!, "this is a SECRET key; the browser must get the publishable key"])

const show = (title: string, list: EnvKey[]) => {
  if (!list.length) return
  console.log(`\n${title}`)
  for (const k of list) {
    console.log(`  • ${k.key}${k.feature ? `  (for ${k.feature})` : ""}`)
    k.steps.forEach((s, i) => console.log(`      ${k.steps.length > 1 ? `${i + 1}) ` : ""}${s}`))
  }
}
show("✗ Missing — required for development:", missing.dev)
show(prod ? "✗ Missing — required for production:" : "• Missing — needed before production:", missing.prod)
show("• Missing — needed only for these features:", missing.feature)
if (process.argv.includes("--all")) show("• Optional:", missing.optional)
if (invalid.length) {
  console.log("\n✗ Invalid values:")
  for (const [k, e] of invalid) console.log(`  • ${k.key}: ${e}`)
}
const blocking = missing.dev.length + invalid.length + (prod ? missing.prod.length : 0)
console.log(blocking ? `\nenv:check failed (${blocking} blocking).` : `\nenv:check passed for ${prod ? "production" : "development"}.`)
process.exit(blocking ? 1 : 0)
