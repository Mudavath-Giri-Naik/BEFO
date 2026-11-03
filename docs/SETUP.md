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

### G2 — Supabase + Google
1. supabase.com → create **two** projects: `befo-dev` and `befo-prod` (region: Mumbai).
2. For each: copy Project URL and the **publishable** + **secret** keys (Settings → API Keys) into `.env` (see the comments there).
3. Install the CLI: `pnpm dlx supabase login`, then `pnpm dlx supabase link --project-ref <ref>`.
4. `pnpm dlx supabase db push` (runs every migration). For dev data: run `supabase/seed/seed.sql` in the SQL editor.
5. Google sign-in: follow the steps above `GOOGLE_OAUTH_CLIENT_ID` in `.env`.
6. Set `VITE_DATA_SOURCE=supabase`, restart `pnpm dev`.

### G3 — MSG91 + DLT (takes 1–3 days, start early)
Follow the steps above `MSG91_AUTH_KEY` in `.env`. Until then `SMS_DRIVER=console` prints OTPs in the function logs.

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
