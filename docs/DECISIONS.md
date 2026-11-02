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

## 2026-11-03 (overnight, owner asleep — no questions asked)
- **MSG91 driver uses the OTP API v5** (`POST control.msg91.com/api/v5/otp?template_id&mobile&otp`, header `authkey`), passing Supabase's OTP through. **UNVERIFIED** against MSG91's current docs (their site was not reachable from the build machine). Check at Gate G3; the request builder is isolated in `supabase/functions/_shared/sms.ts` and unit-tested.
- **Console SMS on hosted projects is refused** unless `ALLOW_CONSOLE_SMS_IN_PROD=1` (set it only on the dev project), so OTPs can never leak into prod logs by mistake.
- **Pages Functions** are written but not run (no Cloudflare account yet). Verify after Gate G4 with `wrangler pages dev dist`.
- **CSP** has no `'unsafe-inline'` for scripts; the theme no-flash script moved to `public/theme-init.js`.
- **`/demo` = the real owner screens on example data** (same components, read-only). Every action shows "This is demo data. Nothing is saved."
- **Not deployed to production:** there are no Supabase/Cloudflare accounts yet (gates G0, G2–G4). Everything is pushed to GitHub.

## 2026-11-03 — redesign (owner's request: "like stayscape.framer.website")
- **Visual language follows the Stayscape Framer template's layout and feel** (floating pill logo + round icon buttons, two-column menu card with a photo button, centred hero with location pill, black pill CTA with a round arrow, stats card, rounded photo blocks, dark photo intro with overlapping stats, pill marquees, stacking numbered photo cards, pill FAQ, dark pricing band, dark footer with big wordmark). Their photos, copy and logo are **not** used; all content is BEFO's own.
- **Tokens:** calm grey paper (#f1f1f0) with a fixed SVG film grain, near-black ink, one violet accent (#5b4ff0) used for the open-menu state and the logo's free bed. Leaf green stays the "free beds" colour. Font: Figtree (self-hosted).
- **Motion:** Lenis smooth scrolling for wheel/trackpad (touch keeps native momentum), fade-up + blur reveals and word-by-word headline reveals (motion/react), subtle parallax on large photos, CSS marquees, CSS sticky stacking cards. Everything turns off under `prefers-reduced-motion`.
- **Photos:** marketing sections use Unsplash photos (Unsplash licence: free, no attribution needed), hot-linked from images.unsplash.com (added to the CSP `img-src`). In **demo mode only**, example listings also use these photos; real listings show the owner's photos or a neutral drawn cover — never a stock photo, so a place is never misrepresented.
- **Honest social proof:** no invented ratings, reviews or customer faces. The hero stats card shows the live "beds free today" count; the avatar row shows place-type icons instead of people.
- **Known gap:** the new home-page copy is English only for now; Telugu strings for these sections are still to be added (Phase 12). `docs/screens/*` predate the redesign and will be regenerated after deploy (the build machine can't load the photos).
