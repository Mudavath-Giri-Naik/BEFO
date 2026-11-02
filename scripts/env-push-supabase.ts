/**
 * pnpm env:push-supabase [--project-ref <ref>]
 * Pushes server-side keys (marked `server` in env-spec.ts) to Supabase Edge Function secrets.
 * Skips every key starting with SUPABASE_ (reserved; hosted functions already get them).
 */
import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { config } from "dotenv"
import { ENV } from "./env-spec"

config({ path: process.env.ENV_FILE ?? ".env", quiet: true })
const lines = ENV.filter((k) => k.server && !k.key.startsWith("SUPABASE_") && (process.env[k.key] ?? "").trim() !== "")
  .map((k) => `${k.key}=${JSON.stringify(process.env[k.key]!.trim())}`)
if (!lines.length) {
  console.log("Nothing to push (no server keys are set).")
  process.exit(0)
}
const dir = mkdtempSync(path.join(tmpdir(), "befo-env-"))
const file = path.join(dir, "secrets.env")
writeFileSync(file, lines.join("\n") + "\n", { mode: 0o600 })
const ref = process.argv.includes("--project-ref") ? ["--project-ref", process.argv[process.argv.indexOf("--project-ref") + 1]] : []
const r = spawnSync("npx", ["supabase", "secrets", "set", "--env-file", file, ...ref], { stdio: "inherit", shell: process.platform === "win32" })
rmSync(dir, { recursive: true, force: true })
console.log(r.status === 0 ? `Pushed ${lines.length} secrets: ${lines.map((l) => l.split("=")[0]).join(", ")}` : "supabase secrets set failed — are you logged in (npx supabase login) and linked (npx supabase link)?")
process.exit(r.status ?? 1)
