/**
 * Tenant isolation + RLS suite (release blocker, §10.11).
 * Rebuilds a throwaway database from the Supabase stub + all migrations + seed, then acts as
 * anon / each seeded user and proves nobody can see or change another tenant's data.
 *
 *   TEST_DATABASE_URL=postgres://postgres@localhost:54329/postgres pnpm test:rls
 *
 * Needs Postgres 16 with PostGIS + pg_trgm + pgcrypto (CI uses the postgis/postgis image).
 */
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import pg from "pg"

const ADMIN_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:54329/postgres"
const DB = "befo_rls_test"
const root = path.resolve(import.meta.dirname, "../..")

const U = {
  ownerMess: "00000000-0000-4000-a000-000000000001",
  ownerBoys: "00000000-0000-4000-a000-000000000002",
  ownerGirls: "00000000-0000-4000-a000-000000000003",
  ownerA: "00000000-0000-4000-a000-000000000004",
  ownerB: "00000000-0000-4000-a000-000000000005",
  managerBoys: "00000000-0000-4000-a000-000000000006",
  multi: "00000000-0000-4000-a000-000000000007", // member of mess + A, manager of B
  girl: "00000000-0000-4000-a000-000000000008",
  outsider: "00000000-0000-4000-a000-000000000009",
  noPhone: "00000000-0000-4000-a000-000000000010",
  admin: "00000000-0000-4000-a000-000000000011",
}
const T = {
  mess: "10000000-0000-4000-a000-000000000001",
  boys: "10000000-0000-4000-a000-000000000002",
  girls: "10000000-0000-4000-a000-000000000003",
  a: "10000000-0000-4000-a000-000000000004",
  b: "10000000-0000-4000-a000-000000000005",
}
const ALLOWED: Record<string, string[]> = {
  [U.ownerMess]: [T.mess], [U.ownerBoys]: [T.boys], [U.ownerGirls]: [T.girls], [U.ownerA]: [T.a], [U.ownerB]: [T.b],
  [U.managerBoys]: [T.boys], [U.multi]: [T.mess, T.a, T.b], [U.girl]: [T.girls], [U.outsider]: [T.mess /* listed number */],
  [U.noPhone]: [], [U.admin]: [],
}
// Functions anon may execute. Anything else executable by anon fails the suite.
const ANON_FUNCTIONS = new Set([
  "search_places", "public_room_types", "public_menu", "public_place_detail", "public_join_info", "public_place_meta",
  "public_stats", "public_suggest", "public_cities", "public_sitemap", "report_place", "_coarse", "_availability_state", "tenant_today",
])
// Extension-owned functions that land in `public` on plain Postgres are ignored (on Supabase they live in `extensions`).

let pass = 0
const failures: string[] = []
function ok(cond: unknown, name: string) {
  if (cond) pass++
  else failures.push(name)
}

async function setup() {
  const admin = new pg.Client({ connectionString: ADMIN_URL })
  await admin.connect()
  await admin.query(`drop database if exists ${DB} with (force)`)
  await admin.query(`create database ${DB}`)
  await admin.end()
  const url = new URL(ADMIN_URL)
  url.pathname = "/" + DB
  const c = new pg.Client({ connectionString: url.toString() })
  await c.connect()
  const files = [
    "tests/rls/supabase-stub.sql",
    ...readdirSync(path.join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort().map((f) => `supabase/migrations/${f}`),
    "supabase/seed/seed.sql",
  ]
  for (const f of files) {
    try {
      await c.query(readFileSync(path.join(root, f), "utf8"))
    } catch (e) {
      throw new Error(`${f}: ${(e as Error).message}`)
    }
  }
  return c
}

type Q = <R extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params?: unknown[]) => Promise<pg.QueryResult<R>>

/** Run fn inside a transaction as a role (and user), always rolled back. */
async function as(c: pg.Client, who: string | "anon", fn: (q: Q) => Promise<void>, commit = false) {
  await c.query("begin")
  try {
    if (who === "anon") {
      await c.query("select set_config('request.jwt.claims', '{\"role\":\"anon\"}', true)")
      await c.query("set local role anon")
    } else {
      await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: who, role: "authenticated" })])
      await c.query("set local role authenticated")
    }
    await fn((sql, params) => c.query(sql, params))
    await c.query(commit ? "commit" : "rollback")
  } catch (e) {
    await c.query("rollback")
    throw e
  }
}

/** Expect a statement to fail; returns the error message. Uses a savepoint so the tx survives. */
async function fails(q: Q, sql: string, params?: unknown[]): Promise<string | null> {
  await q("savepoint s")
  try {
    await q(sql, params)
    await q("release savepoint s")
    return null
  } catch (e) {
    await q("rollback to savepoint s")
    return (e as Error).message
  }
}

async function main() {
  const c = await setup()
  const tenantTables = (await c.query<{ table_name: string }>(
    `select table_name from information_schema.columns c join information_schema.tables t using (table_schema, table_name)
      where table_schema = 'public' and column_name = 'tenant_id' and t.table_type = 'BASE TABLE' order by 1`)).rows.map((r) => r.table_name)
  const allTables = (await c.query<{ tablename: string }>(`select tablename from pg_tables where schemaname = 'public' order by 1`)).rows.map((r) => r.tablename)

  // ── 1. anon sees no base table at all
  await as(c, "anon", async (q) => {
    for (const t of allTables) {
      const err = await fails(q, `select 1 from public.${t} limit 1`)
      ok(err && /permission denied/.test(err), `anon cannot read ${t}`)
    }
    const cards = await q<{ slug: string }>("select slug from public.public_place_cards order by slug")
    ok(cards.rows.map((r) => r.slug).join() === "annapurna-mess,sai-krishna-boys-hostel,sri-lakshmi-ladies-hostel", "anon sees only approved listed places")
    ok((await q("select public.public_place_detail('other-b') d")).rows[0].d === null, "pending place has no public page")
    ok((await q("select public.public_place_detail('other-a') d")).rows[0].d === null, "draft/private place has no public page")
    const girls = (await q("select public.public_place_detail('sri-lakshmi-ladies-hostel') d")).rows[0].d
    ok(girls.address === null && girls.phone === null, "area_only hides address and phone")
    ok(Math.abs(girls.lat - 17.8188) > 0.0005 && Math.abs(girls.lat - 17.8188) < 0.003, "area_only coordinate is coarsened")
    const mess = (await q("select public.public_place_detail('annapurna-mess') d")).rows[0].d
    ok(mess.address?.includes("Chintalavalasa") && mess.phone === "+919000000001", "full + show_phone exposes address/phone")
    ok(!JSON.stringify(mess).includes("Bhavani") && !JSON.stringify(mess).includes("+919111"), "public detail contains no member data")
    ok((await q("select count(*)::int n from public.search_places()")).rows[0].n === 3, "search returns only public places")
    ok((await q("select count(*)::int n from public.search_places(p_type => 'hostel', p_audience => 'girls')")).rows[0].n === 1, "audience filter")
    ok((await q("select public.public_join_info('other-a') d")).rows[0].d?.name === "Other Tenant A", "QR join info works for private places")
    for (const fn of ["public._record_member_payment(null,null,null,null,null,null,null,null,null)", "public._trust()", "public.create_tenant('x','xyz-abc','mess','c')", "public.mark_paid(null, 1)", "public.verified_phone()"]) {
      const err = await fails(q, `select ${fn}`)
      ok(err && /permission denied/.test(err), `anon cannot execute ${fn.split("(")[0]}`)
    }
  })

  // ── 2. anon-executable function allow-list
  const anonFns = (await c.query<{ proname: string }>(
    `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
      where n.nspname = 'public' and d.objid is null and has_function_privilege('anon', p.oid, 'execute')`)).rows.map((r) => r.proname)
  for (const f of anonFns) ok(ANON_FUNCTIONS.has(f), `anon may not execute public.${f}`)

  // ── 3. generic isolation: every tenant table, every user
  for (const [user, allowed] of Object.entries(ALLOWED)) {
    await as(c, user, async (q) => {
      for (const t of tenantTables) {
        // rows addressed to the person themself (their own join request / notification) are allowed
        const own = ["join_requests", "notifications", "card_unlocks"].includes(t) ? " or user_id = auth.uid()" : ""
        const r = await q<{ n: number }>(`select count(*)::int n from public.${t} where not (tenant_id = any($1::uuid[])${own})`, [allowed])
        ok(r.rows[0].n === 0, `user ${user.slice(-2)} sees no foreign rows in ${t}`)
      }
      const ov = await q<{ n: number }>(`select count(*)::int n from public.member_overview where not (tenant_id = any($1::uuid[]))`, [allowed])
      ok(ov.rows[0].n === 0, `user ${user.slice(-2)} member_overview isolated`)
    })
  }

  // ── 4. finance is owner-only by default
  await as(c, U.managerBoys, async (q) => {
    for (const t of ["transactions", "accounts", "categories", "finance_month_summary"]) {
      ok((await q(`select count(*)::int n from public.${t}`)).rows[0].n === 0, `manager without can_see_money sees no ${t}`)
    }
    ok((await q("select count(*)::int n from public.members")).rows[0].n === 2, "manager sees own tenant members")
    const err = await fails(q, "select public.void_payment((select id from public.payments limit 1), 'x')")
    ok(err && /forbidden/.test(err), "manager cannot void payments")
    ok(/forbidden/.test((await fails(q, `select public.invite_staff('${T.boys}', '9876543210')`)) ?? ""), "manager cannot invite staff")
  })
  await as(c, U.ownerBoys, async (q) => {
    ok((await q("select count(*)::int n from public.transactions")).rows[0].n >= 2, "owner sees own transactions")
  })

  // ── 5. a person who is a customer in two places and staff in a third
  await as(c, U.multi, async (q) => {
    const m = await q<{ name: string; tenant_id: string }>("select name, tenant_id from public.members order by tenant_id, name")
    const mine = m.rows.filter((r) => r.tenant_id !== T.b)
    ok(mine.length === 2 && mine.every((r) => r.name === "Anil Varma"), "customer sees only their own member rows")
    ok((await q("select count(*)::int n from public.payments where tenant_id = $1", [T.mess])).rows[0].n === 1, "customer sees only own payments")
    ok((await q("select count(*)::int n from public.transactions")).rows[0].n === 0, "manager-of-B customer sees no transactions")
    ok((await q("select count(*)::int n from public.notices where tenant_id = $1", [T.a])).rows[0].n === 1, "member reads notices of own place")
    const ctx = (await q("select public.my_context() c")).rows[0].c
    ok(ctx.staff.length === 1 && ctx.memberships.length === 2, "my_context lists 1 staff place + 2 memberships")
    ok(/forbidden/.test((await fails(q, "select public.submit_payment_claim('60000000-0000-4000-a000-000000000002', 300000, 'upi')")) ?? ""), "cannot claim for someone else's membership")
  })

  // ── 6. direct writes across tenants are impossible
  await as(c, U.ownerA, async (q) => {
    const upd = await q("update public.place_profiles set headline = 'hacked' where tenant_id = $1", [T.mess])
    ok(upd.rowCount === 0, "owner A cannot update mess profile")
    ok(/row-level security/.test((await fails(q, "insert into public.room_types (tenant_id, name, monthly_price_paise) values ($1, 'x', 1)", [T.mess])) ?? ""), "owner A cannot insert rooms into mess")
    ok(/permission denied/.test((await fails(q, "insert into public.transactions (tenant_id, direction, kind, amount_paise, occurred_on) values ($1, 'in', 'other_income', 1, current_date)", [T.a])) ?? ""), "no direct ledger inserts")
    ok(/permission denied/.test((await fails(q, "update public.members set name = 'x' where tenant_id = $1", [T.a])) ?? ""), "no direct member updates")
    ok(/protected_column|permission denied/.test((await fails(q, "update public.place_profiles set moderation_status = 'approved' where tenant_id = $1", [T.a])) ?? ""), "owner cannot self-approve listing")
    ok(/protected_column|permission denied/.test((await fails(q, "update public.tenants set status = 'active', max_members = 9999 where id = $1", [T.a])) ?? ""), "owner cannot change plan/cap")
    for (const [sql, label] of [
      ["select public.mark_paid('60000000-0000-4000-a000-000000000002', 300000)", "mark_paid"],
      ["select public.decide_payment_claim((select id from public.payment_claims where tenant_id = '" + T.mess + "' limit 1), 'confirm')", "decide_payment_claim"],
      ["select public.assign_bed('60000000-0000-4000-a000-000000000008', '50000000-0000-4000-a000-000000000001')", "assign_bed into another tenant's room"],
      ["select public.confirm_availability('" + T.boys + "')", "confirm_availability"],
      ["select public.submit_for_listing('" + T.mess + "')", "submit_for_listing"],
      ["select public.moderate_listing('" + T.a + "', 'approve')", "moderate_listing"],
    ]) {
      ok(/forbidden/.test((await fails(q, sql)) ?? ""), `owner A: ${label} on another tenant is forbidden`)
    }
    const decideOther = await q("select id from public.join_requests") // cannot even see B's request
    ok(decideOther.rowCount === 0, "owner A sees no join requests of others")
  })

  // ── 7. storage paths are tenant-scoped
  await as(c, U.ownerA, async (q) => {
    ok(/row-level security/.test((await fails(q, "insert into storage.objects (bucket_id, name) values ('place-photos', $1)", [`${T.mess}/x.webp`])) ?? ""), "cannot upload into another tenant's folder")
    await q("insert into storage.objects (bucket_id, name) values ('place-photos', $1)", [`${T.a}/ok.webp`])
    ok(true, "can upload into own folder")
    ok(/row-level security/.test((await fails(q, "insert into storage.objects (bucket_id, name) values ('captures', $1)", [`${T.mess}/c/x.pdf`])) ?? ""), "cannot upload captures for another tenant")
  })

  // ── 8. unverified phone can do nothing beyond browsing
  await as(c, U.noPhone, async (q) => {
    ok(/phone_not_verified/.test((await fails(q, "select public.request_to_join('annapurna-mess', 'G', true, true)")) ?? ""), "join needs a verified phone")
    ok(/phone_not_verified/.test((await fails(q, "select public.link_my_memberships()")) ?? ""), "linking needs a verified phone")
    ok(/phone_not_verified/.test((await fails(q, "select public.create_tenant('X', 'xyz-place', 'mess', 'Vizag')")) ?? ""), "creating a place needs a verified phone")
  })

  // ── 9. platform admin has no member/finance PII
  await as(c, U.admin, async (q) => {
    for (const t of ["members", "transactions", "payments", "payment_claims"]) {
      ok((await q(`select count(*)::int n from public.${t}`)).rows[0].n === 0, `admin cannot read ${t}`)
    }
  })

  // ── 10. flows
  await as(c, U.outsider, async (q) => {
    const r = (await q("select public.request_to_join('annapurna-mess', 'New Visitor', true, true) r")).rows[0].r
    ok(r.status === "auto_approved", "listed number is auto-approved")
    ok(/request_open/.test((await fails(q, "select public.request_to_join('sai-krishna-boys-hostel', 'New Visitor', true, true)")) ?? ""), "one open request per place")
    ok(/adult_required/.test((await fails(q, "select public.request_to_join('sri-lakshmi-ladies-hostel', 'NV', false, true)")) ?? ""), "18+ confirmation required")
    ok((await q("select public.my_place_private_details('sri-lakshmi-ladies-hostel') d")).rows[0].d === null, "exact address hidden before approval")
  })
  await as(c, U.managerBoys, async (q) => {
    const before = (await q("select beds_free from public.public_place_cards where slug = 'sai-krishna-boys-hostel'")).rows[0].beds_free
    const rid = (await q("select id from public.join_requests where status = 'pending' limit 1")).rows[0].id
    const r = (await q("select public.decide_join_request($1, 'approve', null, null, '50000000-0000-4000-a000-000000000004', 'B') r", [rid])).rows[0].r
    ok(r.status === "approve" && r.member_id, "manager approves a join request with a bed")
    const after = (await q("select beds_free from public.public_place_cards where slug = 'sai-krishna-boys-hostel'")).rows[0].beds_free
    ok(after === before - 1, "public availability updates after bed assignment")
  })
  await as(c, U.ownerMess, async (q) => {
    const claim = (await q("select id from public.payment_claims where status = 'submitted' limit 1")).rows[0].id
    const before = (await q("select due_on::text from public.member_overview where member_id = '60000000-0000-4000-a000-000000000001'")).rows[0].due_on
    await q("select public.decide_payment_claim($1, 'confirm')", [claim])
    const after = (await q("select due_on::text, sub_status from public.member_overview where member_id = '60000000-0000-4000-a000-000000000001'")).rows[0]
    const today = (await q("select public.tenant_today()::text d")).rows[0].d
    const expected = (await q("select (public.tenant_today() + interval '1 month')::date::text d")).rows[0].d
    ok(before !== after.due_on && after.due_on === expected && after.sub_status === "active", `confirming a claim moves the due date (${before} → ${after.due_on}, today ${today})`)
    ok((await q("select count(*)::int n from public.transactions where claim_id = $1 and status = 'confirmed'", [claim])).rows[0].n === 1, "claim confirm creates exactly one transaction")
    ok(/already_decided/.test((await fails(q, "select public.decide_payment_claim($1, 'confirm')", [claim])) ?? ""), "a claim cannot be confirmed twice")
    ok(/reason_required/.test((await fails(q, "select public.void_payment((select id from public.payments where claim_id = $1), '')", [claim])) ?? ""), "void needs a reason")
    const income = (await q("select income_paise from public.finance_month_summary where month = date_trunc('month', public.tenant_today())::date")).rows[0]?.income_paise
    ok(Number(income) >= 300000, "finance summary updated by trigger")
  })
  await as(c, U.multi, async (q) => {
    const cid = (await q("select public.submit_payment_claim('60000000-0000-4000-a000-000000000001', 300000, 'upi', 'utr000000000001') id")).rows[0].id
    const checks = (await q("select checks from public.payment_claims where id = $1", [cid])).rows[0].checks
    ok(checks.duplicate_utr === true && checks.amount_match === true, "duplicate UTR is flagged on a new claim")
  })

  // ── 11. suspended tenant disappears and stops working
  await as(c, U.admin, async (q) => {
    await q(`select public.admin_set_tenant_status('${T.boys}', 'suspended')`)
    ok((await q("select count(*)::int n from public.public_place_cards where slug = 'sai-krishna-boys-hostel'")).rows[0].n === 0, "suspended place leaves search")
  })
  await as(c, U.ownerA, async (q) => {
    ok(/forbidden/.test((await fails(q, "select public.admin_set_tenant_status($1, 'active')", [T.a])) ?? ""), "only admins change tenant status")
  })

  // ── 12. ledger is append-only even for the database owner
  ok(/ledger_append_only/.test(await c.query("delete from public.transactions where true").then(() => "", (e) => e.message)), "transactions cannot be deleted")

  await c.end()
  console.log(`\nRLS / isolation: ${pass} passed, ${failures.length} failed`)
  if (failures.length) {
    for (const f of failures) console.log("  ✗ " + f)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
