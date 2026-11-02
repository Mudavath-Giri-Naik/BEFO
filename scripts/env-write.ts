/** Writes .env.example (always) and .env (only if missing) from scripts/env-spec.ts. */
import { existsSync, writeFileSync } from "node:fs"
import { ENV, GROUPS, type EnvKey } from "./env-spec"

const label = (k: EnvKey) =>
  k.need === "dev" ? "REQUIRED" : k.need === "prod" ? "REQUIRED for prod" : k.need === "feature" ? `REQUIRED for ${k.feature}` : "OPTIONAL"

function render(withDefaults: boolean) {
  let out = "# BEFO environment. Generated from scripts/env-spec.ts by `pnpm env:example`.\n"
  out += "# .env is git-ignored. Never commit real values. Check with `pnpm env:check`.\n"
  for (const [g, title] of Object.entries(GROUPS)) {
    out += `\n${"#".repeat(60)}\n# ${title}\n${"#".repeat(60)}\n`
    for (const k of ENV.filter((e) => e.group === g)) {
      out += `\n# [${label(k)}]${k.server ? " (server secret → pnpm env:push-supabase)" : ""}\n`
      k.steps.forEach((s, i) => (out += `#  ${k.steps.length > 1 ? `${i + 1}) ` : ""}${s}\n`))
      if (k.example) out += `#  Format: ${k.example}\n`
      if (k.docs) out += `#  Docs: ${k.docs}\n`
      out += `${k.key}=${withDefaults ? k.devDefault ?? "" : k.devDefault && !k.key.startsWith("VITE_SUPABASE") ? k.devDefault : ""}\n`
    }
  }
  return out
}

writeFileSync(".env.example", render(false))
console.log("Wrote .env.example")
if (!existsSync(".env")) {
  writeFileSync(".env", render(true))
  console.log("Wrote .env with dev defaults (demo data, console SMS, fixture AI). Fill the rest as you pass each gate.")
}
