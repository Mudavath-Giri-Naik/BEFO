/**
 * Schema lint (CI blocker, §10.11). Run against a database with all migrations applied:
 *   TEST_DATABASE_URL=postgres://... pnpm db:lint            (lints the befo_rls_test database by default)
 * Fails when:
 *  - a public table has RLS disabled, or has no policy and is not on the no-policy allow-list
 *  - a SECURITY DEFINER function in public has no `search_path` setting
 *  - a public view is not security_invoker (except the allow-listed public views)
 *  - a money column is not `<name>_paise bigint`
 */
import pg from "pg"

const NO_POLICY_TABLES = new Set(["system_events", "rate_limits", "member_unique_values", "jobs", "webauthn_challenges", "sms_log"])
const PUBLIC_DEFINER_VIEWS = new Set<string>()
const MONEY_WORDS = /(amount|price|cost|fee|salary|wage|balance|deposit|paid|gross|net|income|expense|investment|rate)(_|$)/

async function main() {
  const base = new URL(process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:54329/postgres")
  if (!process.env.LINT_DATABASE_URL) base.pathname = "/befo_rls_test"
  const c = new pg.Client({ connectionString: process.env.LINT_DATABASE_URL ?? base.toString() })
  await c.connect()
  const problems: string[] = []

  const tables = await c.query<{ relname: string; relrowsecurity: boolean; policies: number }>(`
    select c.relname, c.relrowsecurity, (select count(*)::int from pg_policy p where p.polrelid = c.oid) policies
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')`)
  for (const t of tables.rows) {
    if (!t.relrowsecurity) problems.push(`table ${t.relname}: RLS is not enabled`)
    if (t.policies === 0 && !NO_POLICY_TABLES.has(t.relname)) problems.push(`table ${t.relname}: no policies (add some or allow-list it)`)
  }

  const fns = await c.query<{ proname: string }>(`
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')`)
  for (const f of fns.rows) problems.push(`function ${f.proname}: SECURITY DEFINER without search_path`)

  const views = await c.query<{ relname: string; opts: string[] | null }>(`
    select c.relname, c.reloptions opts from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'v'
       and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')`)
  for (const v of views.rows) {
    const invoker = (v.opts ?? []).some((o) => o === "security_invoker=true" || o === "security_invoker=on")
    if (!invoker && !PUBLIC_DEFINER_VIEWS.has(v.relname)) problems.push(`view ${v.relname}: must be security_invoker (or allow-listed)`)
  }

  const cols = await c.query<{ table_name: string; column_name: string; data_type: string }>(`
    select c.table_name, c.column_name, c.data_type from information_schema.columns c
      join information_schema.tables t using (table_schema, table_name)
     where c.table_schema = 'public' and t.table_type = 'BASE TABLE'`)
  for (const col of cols.rows) {
    const n = col.column_name
    if (n.endsWith("_paise") && col.data_type !== "bigint") problems.push(`${col.table_name}.${n}: _paise columns must be bigint`)
    const numeric = ["integer", "bigint", "numeric", "double precision", "real", "smallint"].includes(col.data_type)
    if (numeric && MONEY_WORDS.test(n) && !n.endsWith("_paise") && !/(_days|_count|_pct|confidence)$/.test(n)) {
      problems.push(`${col.table_name}.${n}: looks like money; name it *_paise bigint`)
    }
  }

  await c.end()
  if (problems.length) {
    console.error("Schema lint failed:\n" + problems.map((p) => "  ✗ " + p).join("\n"))
    process.exit(1)
  }
  console.log(`Schema lint passed (${tables.rowCount} tables, ${views.rowCount} views checked).`)
}
main().catch((e) => { console.error(e); process.exit(1) })
