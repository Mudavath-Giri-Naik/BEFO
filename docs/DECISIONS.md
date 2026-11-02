# Decisions and deviations

Format: date · decision · why. Anything the spec asked for that could not be verified is marked **UNVERIFIED**.

## 2026-11-02 (Phases 0–1)
- **Name/brand:** BEFO (owner's instruction). Still read from `VITE_APP_NAME`; never hard-coded in UI code. The demo seed and the MSG91 template suggestion mention BEFO as an example only.
- **TypeScript pinned to 6.0.x.** TS 7 (native compiler) installs by default but typescript-eslint 8 supports `<6.1`. Revisit when typescript-eslint adds TS 7.
- **Versions in use:** React 19.3, React Router 8 (`createBrowserRouter`), Vite 8 (Rolldown), Tailwind 4.3, Vitest 5, Zod 4, vite-plugin-pwa 2.
- **shadcn components were vendored from the official shadcn/ui GitHub source** (`apps/v4/registry/new-york-v4/ui`) because ui.shadcn.com and the Animate UI registry are blocked from the build machine. Imports were rewritten to `@/lib/utils`, `@/components/ui/*`; `sonner` uses our theme hook instead of `next-themes`. Once Gate G1 is done on your PC, `pnpm dlx shadcn@latest add <name> --overwrite` refreshes any component. List in `docs/UI_INVENTORY.md`.
- **Animate UI registry URL in `components.json` is UNVERIFIED** (`@animate-ui → https://animate-ui.com/r/{name}.json`); their MCP docs page did not include it. Check https://animate-ui.com/docs/installation at Gate G1 and fix if different. No Animate UI item is installed yet.
- **Fonts are self-hosted** via `@fontsource` (Bricolage Grotesque for headings, Atkinson Hyperlegible Next for body, Noto Sans Telugu). No Google Fonts request → simpler CSP, works offline. Atkinson's slashed zero is deliberate (legibility of amounts).
- **`VITE_DATA_SOURCE=demo|supabase`** (new key). Demo mode runs the public site on fixtures so it can be used before Gate G2; login and joining are disabled there. `env:check --prod` rejects demo mode. The app still fails fast on missing required keys.
- **Supabase API keys:** Supabase now issues `sb_publishable_…` / `sb_secret_…` keys (Settings → API Keys) and is retiring legacy `anon`/`service_role` keys by end of 2026. We kept the spec's variable names (`VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) but the steps say to paste the new keys. Source: supabase.com/docs/guides/getting-started/migrating-to-new-api-keys.
- **Send SMS hook secret** is stored whole (`v1,whsec_…`); the function strips the prefix (Supabase docs show this). Verified against supabase.com/docs/guides/auth/auth-hooks.
- **Protected columns pattern:** owners edit their configuration tables directly (RLS + column grants), but moderation/verification/availability/plan columns are guarded by triggers. Definer functions set a transaction-local flag (`_trust()`/`_untrust()`) to change them. `_trust` is not executable by clients.
- **Default EXECUTE to PUBLIC:** Postgres grants it on every new function; we revoke it globally for the migration role and the isolation suite fails if anon can execute anything outside the public API allow-list.
- **Mess "seats"** use a new `place_profiles.seat_capacity` (optional) rather than the SaaS `tenants.max_members`, so the public seat count is the owner's choice and the member cap stays a platform limit.
- **Availability freshness:** `availability_updated_at` changes on any bed/room/plan change and on the weekly one-tap confirmation. Older than `availability_stale_days` (14) → public shows "Ask owner" and no counts.
- **Public search pagination** uses an offset cursor (capped at 24 per page). Sort orders vary per request, so keyset cursors would need one index per sort; offset is fine at this scale. Revisit past ~1,000 listings.
- **"PG" tab:** the spec's Hostel · Mess · PG · Tiffin tabs became All · Hostel · Mess · Tiffin because PG is not a separate business type (PGs list as hostels).
- **Area-only coordinates** are rounded to a 0.003° grid (~330 m) in SQL, and distance sorting uses the coarse point too, so exact locations can't be triangulated.
- **Girls/coed default** `address_public_level = area_only` (all new places default to area_only; owners may switch to full).
- **Ledger is append-only even for the DB owner** (delete trigger). Voiding a payment voids its transaction; confirmed amounts can't be edited.
- **Month-end clamp** follows Postgres `date + interval` exactly (31 Jan + 1 month = 28 Feb; 28 Feb + 1 month = 28 Mar). TS mirrors this and is tested.
- **Payroll `fixed_30`:** a fully employed month pays 30/30 even in 31- or 28-day months; partial months pay `rate × days / 30` capped at 30 days.
- **Advance recovery** is capped at the month's pay; the remainder is carried (reported as `advance_carried_paise`). Net pay never goes below zero.
- **OSM tiles:** default `tile.openstreetmap.org` per spec, acceptable only for low traffic; the OSM tile usage policy requires a valid Referer/attribution and forbids heavy use. Attribution is shown on every map. Switch `VITE_MAP_TILE_URL` to a paid/own tile provider before real traffic. **UNVERIFIED** (policy page not reachable from build machine; based on the published policy at operations.osmfoundation.org/policies/tiles).
- **Local test database:** CI and local isolation tests run on Postgres 16 + PostGIS with `tests/rls/supabase-stub.sql` standing in for Supabase's `auth`/`storage` schemas and roles.
