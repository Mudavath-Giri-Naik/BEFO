/**
 * pnpm db:migrate [--dry-run] [--api]
 * Applies supabase/migrations/*.sql that are not yet recorded on the hosted project, each atomically,
 * and records them in supabase_migrations.schema_migrations (same table the Supabase CLI and MCP use,
 * so `supabase migration list` agrees). Never runs the seed. Prints no secrets.
 *
 * Connection: SUPABASE_DB_URL (Connect → Session pooler URI), or with --api (or when SUPABASE_DB_URL is
 * empty) the Management API SQL endpoint using SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF. One API
 * request is one implicit transaction, so a failing migration leaves nothing behind.
 */
import { randomBytes } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { config } from "dotenv"
import pg from "pg"

config({ path: process.env.ENV_FILE ?? ".env", quiet: true })
const dry = process.argv.includes("--dry-run")
const url = process.env.SUPABASE_DB_URL?.trim()
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim()
const ref = process.env.SUPABASE_PROJECT_REF?.trim()
const useApi = process.argv.includes("--api") || !url
if (useApi && !(token && ref)) {
  console.error("Set SUPABASE_DB_URL, or SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF, in .env.")
  process.exit(1)
}

type Run = (sql: string) => Promise<Record<string, unknown>[]>
let run: Run
let close = async () => {}
if (useApi) {
  run = async (sql) => {
    const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql }),
    })
    const body = await r.text()
    if (!r.ok) throw new Error(`${r.status} ${body}`)
    return JSON.parse(body) as Record<string, unknown>[]
  }
} else {
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url!)
  const c = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } })
  await c.connect()
  run = async (sql) => {
    // a multi-statement simple query is one implicit transaction, same as the API path
    const res = await c.query(sql)
    return (Array.isArray(res) ? res.at(-1)!.rows : res.rows) as Record<string, unknown>[]
  }
  close = () => c.end()
}

const dir = path.resolve(import.meta.dirname, "../supabase/migrations")
const files = readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort()
await run(`create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)`)
const done = new Set((await run("select version from supabase_migrations.schema_migrations")).map((r) => String(r.version)))

let applied = 0
for (const f of files) {
  const [version, ...rest] = f.replace(/\.sql$/, "").split("_")
  const name = rest.join("_")
  if (done.has(version)) {
    console.log(`= ${f} (already applied)`)
    continue
  }
  if (dry) {
    console.log(`+ ${f} (pending)`)
    continue
  }
  const sql = readFileSync(path.join(dir, f), "utf8")
  const tag = `$m${randomBytes(6).toString("hex")}$`
  try {
    await run(`${sql}\n;\ninsert into supabase_migrations.schema_migrations (version, statements, name)
      values ('${version}', array[${tag}${sql}${tag}], '${name.replace(/'/g, "''")}');`)
    console.log(`✓ ${f}`)
    applied++
  } catch (e) {
    const err = e as pg.DatabaseError
    console.error(`✗ ${f}: ${err.message}${err.where ? `\n  where: ${err.where}` : ""}${err.position ? `\n  at char ${err.position}` : ""}`)
    await close()
    process.exit(1)
  }
}
await close()
console.log(dry ? "Dry run done." : `Applied ${applied} migration(s) via ${useApi ? "Management API" : "database URL"}.`)
