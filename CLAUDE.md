# BEFO — project rules for Claude Code

Read `BUILD_PROMPT_v3.md` (the full spec) and `docs/PLAN.md` (status) before working. Product name comes from
`VITE_APP_NAME` — never hard-code it in UI code.

## Non-negotiables
- **pnpm** only. Node ≥ 20. TypeScript strict. TypeScript is pinned to 6.x (typescript-eslint does not support TS 7 yet).
- **Tenant isolation first.** Every tenant table has `tenant_id`, RLS enabled, and is covered by `tests/rls/run.ts`.
  New table / view / function ⇒ add RLS + isolation checks in the same commit. `pnpm test:rls && pnpm db:lint` must pass.
- **Money is paise `bigint`** in SQL (`*_paise` columns) and `bigint` in TS money maths (`src/lib/money.ts`). Display rupees with `formatRupees`.
  Every new money calculation ships with unit tests and a line in `docs/FINANCE_RULES.md`.
- **Dates are IST.** SQL: `public.tenant_today()`. TS: `tenantToday()` from `src/lib/dates.ts`. Never `new Date()` for business dates.
- **Writes go through `security definer` functions** that check role + tenant, set `search_path = ''`, and write `audit_log`.
  Direct table writes are allowed only on owner configuration tables (see 0008_rls_grants.sql). Grant EXECUTE explicitly; anon gets only the public API.
- **Drafts, never silent.** AI/automation creates drafts with proof + confidence unless the owner trusted that pattern.
- **UI = shadcn/ui (+ Animate UI) only.** Components live in `src/components/ui`; ours in `src/components/befo` compose them.
  Colours only via tokens in `src/index.css`. Mobile first (360 px), touch targets ≥ 44 px, light + dark.
- **No secrets in git or the browser.** `.env` is git-ignored; `scripts/env-spec.ts` is the source of truth for keys.
- Zero-work rules (spec §2) bind every feature: no daily chores, exception-based, teach once, tap don't type.

## Commands
| | |
|---|---|
| `pnpm dev` | app on http://localhost:5173 (demo data by default) |
| `pnpm test` | unit tests (Vitest) |
| `pnpm test:rls` | isolation suite on a local Postgres 16 + PostGIS (`TEST_DATABASE_URL`) |
| `pnpm db:lint` | schema lint (RLS, search_path, invoker views, `_paise bigint`) |
| `pnpm test:e2e` | Playwright (builds + previews) |
| `pnpm screens` | screenshots to `docs/screens` (needs `pnpm preview` running) |
| `pnpm env:check [--prod]` | what's missing in `.env` and how to get it |

## Where things live
- Spec + status: `BUILD_PROMPT_v3.md`, `docs/PLAN.md`, decisions: `docs/DECISIONS.md`, gates/checklist: `docs/SETUP.md`
- Database: `supabase/migrations/*`, seed: `supabase/seed/seed.sql`, tests: `tests/rls/*`
- Money rules: `docs/FINANCE_RULES.md` ↔ `src/lib/{money,billing,payroll,finance}.ts`
