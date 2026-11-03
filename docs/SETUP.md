# Setup and human gates

Everything below is in simple steps. You can run the app **today** with no accounts: the default `.env` uses demo data.

## Run it on your computer (Windows)
1. Install Node.js 22 LTS from nodejs.org.
2. Open PowerShell in `E:\Projects\BEFO`.
3. `corepack enable` then `pnpm install`
4. `pnpm dev` → open http://localhost:5173
5. `pnpm test` runs the unit tests. `pnpm env:check` shows which keys are still missing and how to get each one.

## Gates (only these need you)

### G0 — Brand and domain (before G3)
1. Name: **BEFO** (decided).
2. Buy the domain (e.g. befo.in). Tell Claude the final domain.
3. Put it in `.env`: `VITE_APP_URL`, `WEBAUTHN_RP_ID` (domain only), `WEBAUTHN_ALLOWED_ORIGINS`. Changing the domain later breaks saved fingerprint cards.

### G1 — shadcn MCP
1. Open Claude Code in `E:\Projects\BEFO`, then restart it.
2. Run `/mcp` and check `shadcn` shows **Connected**.
3. Ask Claude: "install one Animate UI component and fix the registry URL in components.json if needed".

### G2 — Supabase + Google ✅ (project `jplbjlfxrklvznmmrskh`, eu-central-1, done 2026-11-03)
One real project for now (a separate dev project can come later). What was done, so it can be repeated:
1. `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (the `sb_secret_…` key), `SUPABASE_PROJECT_REF`,
   `SUPABASE_ACCESS_TOKEN` (supabase.com/dashboard/account/tokens) and optionally `SUPABASE_DB_URL`
   (Connect → **Session pooler** URI; the direct `db.<ref>.supabase.co` host is IPv6-only).
2. Migrations: `pnpm db:migrate --dry-run`, then `pnpm db:migrate --api` (or without `--api` when
   `SUPABASE_DB_URL` works). It applies only pending files and records them like the Supabase CLI.
   **Never run `supabase/seed/seed.sql` on this project** — it creates fake users and tenants.
3. Keys: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `SUPABASE_ANON_KEY` = the **publishable** key; `VITE_DATA_SOURCE=supabase`.
4. Google: provider enabled in Supabase; Google Cloud OAuth client has the redirect URI
   `https://jplbjlfxrklvznmmrskh.supabase.co/auth/v1/callback` (verified: Google accepts it).
5. Authentication → URL Configuration: **Site URL** `http://localhost:5173` for now (switch to the Vercel address
   at G4) and **Redirect URLs** `http://localhost:5173/**`, `http://localhost:5174/**` (+ the Vercel address at G4).

### G3 — Phone OTP (now: console driver · later: MSG91 + DLT, 1–3 days, start early)
Every signed-in user must verify a phone. Until MSG91 is ready the Send SMS hook runs in **console mode**:
- `sms-hook` is deployed without JWT check:
  `pnpm dlx supabase functions deploy sms-hook --no-verify-jwt --use-api --project-ref jplbjlfxrklvznmmrskh`
- Edge Function secrets: `SEND_SMS_HOOK_SECRET` (`v1,whsec_…`, same value as in `.env` and in the hook config),
  `SMS_DRIVER=console`, `ALLOW_CONSOLE_SMS_IN_PROD=1`.
- Authentication → Hooks → **Send SMS** = HTTPS `https://jplbjlfxrklvznmmrskh.supabase.co/functions/v1/sms-hook`
  with the same secret; Sign In / Providers → **Phone** enabled.
- Codes appear in Edge Functions → `sms-hook` → **Logs** (`DEV OTP for +91 98•••••10: 123456`). For your own
  number, add a **test phone number** with a fixed code (Phone provider → Test phone numbers, format
  `91XXXXXXXXXX=123456`): Supabase accepts that code without calling the hook at all.

**Switch to MSG91 when DLT is approved:**
1. Fill `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` (and sender/DLT ids) in `.env` — steps above `MSG91_AUTH_KEY`.
2. Edge Function secrets: set `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `SMS_DRIVER=msg91`, and **delete
   `ALLOW_CONSOLE_SMS_IN_PROD`** (Edge Functions → Secrets, or `pnpm env:push-supabase` after removing it from `.env`).
   With the flag gone, a hosted project refuses to print codes even if `SMS_DRIVER` falls back to console.
3. Remove your test phone number (or keep it only on a dev project) so every real login gets a real SMS.
4. Log in with a phone that is *not* a test number and confirm the SMS arrives; `public.sms_log` shows `sent`.

### G4 — Vercel (hosting)
1. vercel.com → **Add New → Project** → import `Mudavath-Giri-Naik/BEFO`. Framework preset **Vite**; build
   settings come from `vercel.json` (pnpm install, `pnpm build`, output `dist`). Leave Root Directory empty.
2. **Environment Variables** (Production + Preview):
   - `VITE_APP_NAME` = `BEFO`
   - `VITE_DATA_SOURCE` = `supabase`
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = the **publishable** key (`sb_publishable_…`) — never the secret key
   - `VITE_APP_URL` = your site address, e.g. `https://befo.vercel.app` (no trailing slash)
   - optional: `VITE_SUPPORT_WHATSAPP`, `VITE_SUPPORT_EMAIL`, `VITE_MAP_TILE_URL`
   The `/api/*`, `/p/:slug` and `/sitemap.xml` edge functions read the same `VITE_` values.
3. Deploy. Then in Supabase → Authentication → URL Configuration set **Site URL** to the Vercel address and add
   `https://<your-domain>/**` to **Redirect URLs** (Google sign-in returns there).
4. Custom domain later: Vercel → Settings → Domains, then repeat step 3 with the new address.
5. Turnstile and R2 backups (Cloudflare) are still optional extras: steps above `VITE_TURNSTILE_SITE_KEY` and group F.

### G5 — GitHub
Repo exists: github.com/Mudavath-Giri-Naik/BEFO. Keep it **private**. Add the group F keys as Actions secrets.

### G6 — AI + email
Anthropic key with a monthly spend limit; Resend domain verified. Until then `AI_DRIVER=fixture`.

### G7 — Pilot data
Tenant #1 member list (Excel), 15–20 real bills / UPI screenshots / one bank statement, one real hostel's rooms.
Create tenant #1 with `pnpm tenant:create` (Phase 3).

### G8 — Legal
A lawyer reviews `/terms`, `/privacy`, listing rules, takedown process and the AI-processing disclosure.

## Testing the database locally (optional)
Needs PostgreSQL 16 with PostGIS (or Docker: `docker run -p 54329:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgis/postgis:16-3.4`).
`set TEST_DATABASE_URL=postgres://postgres@localhost:54329/postgres` then `pnpm test:rls` and `pnpm db:lint`.
