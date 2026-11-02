# BEFO (working title in spec: PLACES PLATFORM) — Final Build Prompt v3

> **For the human (Naikkk):** this file REPLACES v1 and v2. Put it in an empty project folder, open Claude Code there, and say:
> *"Read BUILD_PROMPT_v3.md fully. Follow it end to end. Stop only at the HUMAN GATES it lists."*
> Everything below this box is written to Claude Code.

---

## 1. Role and goal

You are the lead engineer. Build, test, document and make deployable **one website** (no native app) with two faces:

1. **A public marketplace for students and tenants** to *discover and join* hostels (boys / girls / co-living), PGs, messes and tiffin services. Anyone can browse without logging in: real seats available, room types, fixed prices, facilities, rules, photos, today's menu. All information is entered and controlled by the place's owner. It is not scraped from Google Maps and not written by us.
2. **A management suite for owners** (multi-tenant SaaS) that makes owners do almost zero work while tracking **customers, employees and finance** completely.

Working product name: **`APP_NAME`** (placeholder from `VITE_APP_NAME`; never hard-code a brand). The brand is chosen at Gate G0.

**First customer (tenant #1):** Sri Vijaya Food Court & Family Restaurant, a mess near MVGR College, Vizianagaram/Vizag, about 250 students, one plan of ₹3,000 per month. Created by a seed script. **No code may be specific to this tenant.**

**Three kinds of people**
- **Owner / manager** — runs a place. Does a short weekly routine, not daily work.
- **Customer** (student / resident / member) — browses, requests to join, registers once, shows a fingerprint-locked ID card, occasionally taps "I paid". Does nothing else.
- **Employee** (cook, server, cleaner, warden) — does nothing in the app. The owner manages them; they get an ID card.

**Out of scope for V1 (do NOT build):** payment gateways (Razorpay etc.) or collecting money inside the app, native mobile apps, WhatsApp/Meta APIs, ratings and reviews, chat between users, scanning of cards, minors (V1 is 18+), custom domains per place, SaaS billing of owners (design the hooks only).

Work autonomously. Make sensible decisions, record each in `docs/DECISIONS.md`, and keep going. Ask the human only at the **HUMAN GATES** (section 8).

---

## 2. The zero-work rules (binding on every feature)

Every feature and screen must pass these. If one fails, redesign it or drop it and note it in `DECISIONS.md`.

1. **No daily chore for anyone.** Owner target: about **10 minutes per week** (a guided "Weekly Close"). Customers: register once, then at most a monthly "I paid". Employees: nothing.
2. **Exception-based.** Assume normal. Humans act only on exceptions (an absence, an unknown payer, a low-confidence bill).
3. **Teach once, automatic after.** Every manual answer (who is this UPI ID, which category is this vendor) is remembered and reused.
4. **Never wrong in silence.** AI and automation only create **drafts** unless the owner explicitly trusted that pattern. Every record keeps its proof (file, screenshot, source) and a confidence value.
5. **Tap, don't type.** Owners choose from chips, pickers and presets, or photograph/speak. Free-text typing is the last resort.
6. **Owner controls everything.** Every record the owner creates (place profile, prices, rooms, menu, members, money) can be edited, hidden, voided or deleted (soft) by the owner. Money records are voided or reversed, never erased.
7. **Honest numbers.** Anything shown as "available now" or "verified" must be derived from real data and show its freshness (section 12.4).

---

## 3. Locked decisions (do not re-debate)

| Topic | Decision |
|---|---|
| Platform | Website only (React SPA + installable PWA). No native app. |
| Backend | **Supabase** (Postgres, Auth, Storage, Realtime, Edge Functions, pg_cron, PostGIS). |
| Tenancy | One shared database, `tenant_id` on every tenant row, **Row Level Security**. Path-based URLs. |
| Login | **Sign in with Google** (primary) or phone OTP. **A verified mobile number is mandatory for everyone** before using anything beyond browsing. SMS OTP via Send SMS Hook → MSG91. |
| Roles | `platform_admin`, `owner`, `manager`, `member` (customer). Employees are records, not users. |
| Business types | `mess`, `hostel` (audience: boys / girls / coed), `tiffin`, `other`. A **preset** fills sensible defaults; everything stays editable. |
| Money units | **Paise, `bigint`** everywhere in the database. Display rupees (hide `.00`). Rounding: half up to whole paise; salaries round to whole rupees. |
| Incoming payments | Customers pay the owner directly (UPI to the owner's UPI ID, or cash). In the app the customer taps **"I paid"** (+ method, reference/UTR, optional screenshot). **The owner confirms.** No gateway. |
| Outgoing money | Owner uploads bills / payment screenshots or speaks / quick-adds. AI extracts the data into drafts. Owner confirms with one tap. |
| Billing model | One recurring plan per member + one-time charges (deposit / fee / penalty). `due_rule`: `from_payment_date` (mess default) or `from_previous_due` (hostel default). Month-end clamp via Postgres `date + interval`. |
| Validity | Valid **through** the due date; `grace_days` default 0. |
| Timezone / currency | `Asia/Kolkata`; INR only. All date logic through `tenant_today()`. |
| Shared phones | Biometric-locked ID card (WebAuthn passkey, platform authenticator, user verification required, 60-second window, live server clock). |
| Photos | Member selfie 360×360 WebP ≤ ~40 KB, private bucket, locked after approval. Place photos ≤ ~200 KB each, public bucket. |
| Package manager | **pnpm**. |
| Hosting | Cloudflare Pages + Pages Functions (not Vercel Hobby, which is non-commercial). |
| Sensitive data | Do not build collection of government ID numbers/images or health data. Warn when a custom field label looks like one (Aadhaar, PAN, passport, voter, licence, medical, health). |

### 3.1 Where the human's idea was adjusted (implement the adjusted version)

- **"I paid" screenshots are not proof** (they can be edited). The owner's own bank/UPI record is the truth, so the owner's confirmation is the authority. The app adds cross-checks (amount, payee, date, duplicate UTR, duplicate image) and, later, matching against an uploaded bank statement, which gives a "bank-verified" badge.
- **Public listings need trust and safety.** Fake listings, scams and privacy risks (especially girls' hostels) are real. So: admin review before a place appears in the directory, a "Verified" badge only after a real check, a report button, exact addresses hidden until approval (section 12.5).
- **"Seats available right now" is only true if the data is fresh.** Availability is derived from real bed assignments and shows "updated X ago"; stale data is nudged or hidden.
- **Google sign-in does not verify a phone number.** So Google is followed by a mandatory phone OTP step (same SMS cost as before).
- **AI reading of bills is never 100%.** The design is draft → confirm, with an Inbox for uncertain items, not blind automation.
- **Map:** no Google Maps API. The owner drops a pin; the site shows an OpenStreetMap-based map and an "Open in Google Maps" link built from coordinates.
- **Web push on iPhone** works only after the site is added to the Home Screen. Email and in-app notifications are the fallback.

---

## 4. Stack and architecture

- **Frontend:** Vite + React + TypeScript (strict) + React Router + TanStack Query + react-hook-form + zod; Tailwind CSS v4; **shadcn/ui only + Animate UI registry** via the shadcn MCP (section 22). PWA via `vite-plugin-pwa` (custom service worker for push). i18n with `react-i18next` (English + Telugu).
- **Backend:** Supabase. Extensions: `postgis`, `pg_trgm`, `pg_cron`, `pgcrypto`. Realtime for notifications.
- **Edge Functions (Deno):** `sms-hook`, `card` (passkeys), `notify` (push + email), `ai-worker` (capture extraction, voice parsing), `statement-worker`, `backup-heartbeat`, `weekly-close`.
- **Cloudflare Pages Functions:** server-side meta injection and caching for public pages (12.7).
- **AI:** provider adapter in `supabase/functions/_shared/ai/` with one implementation (Anthropic API, vision + text). Models come from env (`AI_MODEL_FAST`, `AI_MODEL_STRONG`); check the provider docs for current model IDs. Structured JSON output validated with zod; one repair retry; strong-model retry on low confidence.
- **Job queue:** a `jobs` table (`type`, `payload`, `status`, `attempts`, `run_at`, `locked_by`, `error`), claimed with `FOR UPDATE SKIP LOCKED`, triggered by database webhooks / `pg_cron` calling the worker Edge Functions. Retries with backoff, dead-letter status, never block the UI.
- **SMS:** MSG91 via the Send SMS Hook. **Email:** Resend. **Push:** Web Push (VAPID). **Bot protection:** Cloudflare Turnstile.
- **Excel/CSV:** `exceljs` + `papaparse` (lazy-loaded). Do **not** use the npm `xlsx` package.
- **Maps:** MapLibre GL or Leaflet with OpenStreetMap raster tiles at low volume (read the tile usage policy and record it in `DECISIONS.md`), pin picker for owners.
- **Tests:** Vitest, Playwright (virtual authenticator for WebAuthn), SQL/RLS tests.

### 4.1 Scalability design (must hold from 10 to hundreds of places)

- Every tenant table has `tenant_id` as the **first column of its main indexes**, e.g. `(tenant_id, occurred_on)`.
- **Public browsing never hits the database per visitor:** `/api/explore`, `/api/place/:slug` etc. are Pages Functions that call public RPCs and cache responses at the edge (`s-maxage=60, stale-while-revalidate=300`; place pages 120 s). Purge is not required.
- Public data is exposed only through **views / RPCs with an explicit column list**; base tables stay deny-all for `anon`.
- Dashboards read from **incremental summary tables** (`finance_month_summary`, `place_daily_stats`) updated by triggers or jobs, not by scanning the ledger on every page load.
- Heavy work (AI, statements, PDFs, imports, notifications) goes through the `jobs` queue.
- Cursor pagination everywhere; no unbounded lists.
- Per-tenant **quotas**: members, photos, AI documents per day/month, storage MB. Counted in `tenant_usage`.
- Observability: `system_events`, structured logs without PII, optional Sentry.
- Plan assumption: Supabase **Pro** before the first outside paying customer (storage, backups, no pausing).

---

## 5. Repository layout

```
places-app/
├─ CLAUDE.md                     # project rules (you write it)
├─ BUILD_PROMPT_v3.md
├─ .mcp.json                     # shadcn MCP
├─ .env                          # git-ignored, human fills (section 7)
├─ .env.example                  # same comments, empty values, committed
├─ components.json               # shadcn + registries
├─ functions/                    # Cloudflare Pages Functions (api/*, p/[slug].ts, sitemap.xml.ts)
├─ public/ (icons, robots.txt, sw assets)
├─ src/
│  ├─ app/ (router, providers, theme, i18n, brand)
│  ├─ components/ui/             # only shadcn / animate-ui items
│  ├─ presets/ (mess, hostel, tiffin, other: plans, fields, categories, menu template, reminder texts)
│  ├─ features/
│  │  ├─ marketing/ (home, for-owners, demo, legal, help)
│  │  ├─ explore/ (search, filters, cards, compare, shortlist, place page)
│  │  ├─ auth/ (login, phone verify, guards)
│  │  ├─ onboarding-owner/ (list-your-place wizard, place profile editor)
│  │  ├─ customer/ (me home, requests, join flow, i-paid, payments, card, notifications, profile)
│  │  ├─ owner/ (today, inbox, members, requests, payments, rooms, menu, notices, reports, import, qr, settings, staff, audit, backups, weekly-close)
│  │  ├─ money/ (capture, quick-add, voice, inbox, transactions, parties, payables, recurring, categories, accounts, reports, forecast, statements, assets, documents)
│  │  ├─ team/ (employees, attendance exceptions, payouts, payslips, staff cards)
│  │  └─ admin/ (platform console, moderation)
│  ├─ lib/ (supabase, phone, dates, money, status, custom-fields, excel/, share, geo, notifications)
│  └─ locales/ (en.json, te.json)
├─ supabase/ (config.toml, migrations/, seed/, functions/{sms-hook,card,notify,ai-worker,statement-worker,weekly-close,backup-heartbeat,_shared})
├─ scripts/ (create-tenant.ts, add-platform-admin.ts, purge-tenant.ts, env-check.ts, env-push-supabase.ts)
├─ tests/ (unit, rls, e2e, fixtures/bills/)
├─ .github/workflows/ (ci.yml, backup.yml)
└─ docs/ (PLAN.md, SETUP.md, DECISIONS.md, UI_INVENTORY.md, FINANCE_RULES.md, RESTORE.md, SECURITY.md, OWNER_GUIDE.md, ADMIN_GUIDE.md, screens/)
```

---

## 6. Money rules for the whole system (`docs/FINANCE_RULES.md` must restate and unit-test these)

- Ledger = one append-only table `transactions`. Voiding creates a reversal or sets `voided_at`; never delete.
- **Income** = confirmed member payments (subscription, extension, charges) + other income. **Deposits** are liabilities, not income. **Investments** (assets bought: fridge, furniture, utensils) are separate from running costs.
- **Profit (operating)** = income − operating expenses (including salaries, rent, utilities, food). **Cash profit** also subtracts investments. Show both, clearly labelled.
- A bill and its payment are the same event; they must merge into **one** transaction (dedupe by UTR, then vendor + amount + date window, then image hash).
- Unpaid bills create **payables** (vendor credit); paying them later links to the bill.
- A month can be **closed**: edits then require reopening, which is audited.
- The LLM never computes totals. All numbers come from SQL / typed functions. The LLM may only narrate numbers it is handed.

---

## 7. Environment: `.env` (the human fills it)

Create **`.env`** (git-ignored) and **`.env.example`** (committed, empty values) with every key below, grouped and **with comments above each key giving numbered, simple steps to obtain it** (where to click, what to copy, the format of the value, whether it is required, and which environment). Verify every step against the current official docs/dashboards while building and correct anything that changed; dashboards move. Add the docs URL in the comment where useful. Also provide:

- `pnpm env:check` (`scripts/env-check.ts`): lists missing/invalid keys, grouped by required-for-dev / required-for-prod / optional, with the key's comment steps, and fails fast. The app and Edge Functions also fail fast with a clear message.
- `pnpm env:push-supabase`: pushes the server-side group to Supabase Edge Function secrets with `supabase secrets set --env-file …`. **Skip any key starting with `SUPABASE_`** (reserved; hosted Edge Functions already receive `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` automatically).
- `docs/SETUP.md`: the same steps as a checklist.

### 7.1 Template (write it with full comments in this style; extend where needed)

```bash
############################################################
# A. FRONTEND  (public values, safe in the browser)
############################################################

# [REQUIRED] Supabase project URL
# Steps: 1) supabase.com/dashboard → open your project  2) Project Settings → API
#        3) copy "Project URL" (looks like https://abcd1234.supabase.co)
VITE_SUPABASE_URL=

# [REQUIRED] Supabase public key (anon / publishable)
# Steps: same page as above → copy the "anon" (or "publishable") key. Safe for browsers.
VITE_SUPABASE_ANON_KEY=

# [REQUIRED] Product name shown everywhere (decide at Gate G0)
VITE_APP_NAME=

# [REQUIRED] Public site URL, no trailing slash (dev: http://localhost:5173)
VITE_APP_URL=

# [REQUIRED] Support WhatsApp number, digits only with country code, e.g. 919876543210
VITE_SUPPORT_WHATSAPP=
# [REQUIRED] Support email shown on the site
VITE_SUPPORT_EMAIL=

# [REQUIRED for prod] Cloudflare Turnstile SITE key (bot protection on OTP screens)
# Steps: 1) dash.cloudflare.com → Turnstile  2) Add widget → add your domains (+ localhost)
#        3) copy "Site key" here. Copy "Secret key" into Supabase: Authentication → Attack Protection
#        → enable CAPTCHA → provider Turnstile → paste secret.
VITE_TURNSTILE_SITE_KEY=

# [REQUIRED for push notifications] Web Push PUBLIC key (VAPID)
# Steps: 1) run:  npx web-push generate-vapid-keys   2) copy "Public Key" here
#        3) copy "Private Key" into VAPID_PRIVATE_KEY below
VITE_VAPID_PUBLIC_KEY=

# [OPTIONAL] Map tile URL template (default OpenStreetMap; fine for low traffic only)
VITE_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png

# [OPTIONAL] Error tracking (sentry.io → Project → Settings → Client Keys (DSN))
VITE_SENTRY_DSN=

############################################################
# B. SUPABASE / AUTH  (server side — never in the browser)
############################################################

# [REQUIRED for scripts + local] Supabase URL (hosted functions get it automatically)
SUPABASE_URL=
# [REQUIRED for scripts + local] service_role / secret key
# Steps: Project Settings → API → copy "service_role" (or "secret") key. NEVER expose publicly.
SUPABASE_SERVICE_ROLE_KEY=

# [REQUIRED] Google sign-in
# Steps: 1) console.cloud.google.com → create/select a project
#        2) APIs & Services → OAuth consent screen → External → app name, support email,
#           authorized domain (your domain) → Save; later click "Publish app" so anyone can log in
#        3) Credentials → Create credentials → OAuth client ID → Web application
#        4) Authorized redirect URI:  https://<PROJECT-REF>.supabase.co/auth/v1/callback
#           (for local Supabase also http://127.0.0.1:54321/auth/v1/callback)
#        5) copy Client ID and Client secret here, then paste them in Supabase:
#           Authentication → Sign In / Providers → Google → enable → save
#        6) Authentication → URL Configuration: set Site URL and add Redirect URLs (prod + localhost)
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

# [REQUIRED] Send SMS Hook secret
# Steps: 1) deploy function sms-hook  2) Supabase → Authentication → Hooks → Send SMS Hook
#        3) type HTTPS, paste the function URL  4) Generate secret  5) copy it here (store the
#        part after "v1,whsec_")  6) enable the hook; also enable the Phone provider
SEND_SMS_HOOK_SECRET=

# [REQUIRED] "console" prints OTP in function logs (dev only). "msg91" sends real SMS.
SMS_DRIVER=console
# [REQUIRED] max SMS the whole platform may send per day (cost safety)
SMS_DAILY_CAP=300

# [REQUIRED for real SMS] MSG91 — needs DLT registration (takes 1–3 days; start early)
# Steps: 1) msg91.com → sign up, finish KYC  2) register on a DLT portal (Jio/Airtel/Vi/BSNL):
#        entity → sender ID (6 letters, matches your brand) → OTP template
#        3) MSG91 dashboard → add the DLT template, note Template ID
#        4) MSG91 → Authkey (profile/API section) → copy
#        Template text suggestion: "##OTP## is your login code for APP_NAME. Do not share it with anyone."
MSG91_AUTH_KEY=
MSG91_SENDER_ID=
MSG91_TEMPLATE_ID=
MSG91_DLT_TEMPLATE_ID=

# [REQUIRED] Fingerprint card (passkeys). RP_ID = your domain only; changing it later breaks passkeys.
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=
WEBAUTHN_ALLOWED_ORIGINS=http://localhost:5173
CARD_UNLOCK_SECONDS=60

# [REQUIRED] Platform admins (comma separated). Admin = verified email OR verified phone match.
PLATFORM_ADMIN_EMAILS=
PLATFORM_ADMIN_PHONES=

# [REQUIRED] Default member cap for new places
DEFAULT_MAX_MEMBERS=100

############################################################
# C. AI  (bill reading, voice entry)
############################################################

# [REQUIRED for Smart Capture] Anthropic API key
# Steps: 1) console.anthropic.com → sign up  2) Billing → add credit, set a monthly spend limit
#        3) API Keys → Create key → copy here
ANTHROPIC_API_KEY=
# [REQUIRED] "fixture" = canned results for dev/CI (no key needed). "anthropic" = real AI.
AI_DRIVER=fixture
# Model IDs: check docs.claude.com for current names. FAST for everyday bills, STRONG for retries.
AI_MODEL_FAST=
AI_MODEL_STRONG=
# Safety limits per place
AI_DAILY_DOCS_PER_TENANT=60
AI_MONTHLY_DOCS_PER_TENANT=1000
AI_MAX_FILE_MB=8

############################################################
# D. NOTIFICATIONS
############################################################

# [REQUIRED for push] VAPID private key (see VITE_VAPID_PUBLIC_KEY steps) and contact
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@yourdomain.com

# [REQUIRED for email] Resend
# Steps: 1) resend.com → sign up  2) Domains → Add domain → add the DNS records (SPF, DKIM) at your
#        domain provider → wait for "Verified"  3) API Keys → Create (sending access) → copy
RESEND_API_KEY=
EMAIL_FROM="APP_NAME <hello@yourdomain.com>"

############################################################
# E. CLOUDFLARE PAGES VARIABLES  (set in Pages → Settings → Variables; also used by functions/)
############################################################
# SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL (same values as above; ANON key only, never service role)
SITE_URL=
SUPABASE_ANON_KEY=

############################################################
# F. BACKUPS + CI  (GitHub → repo → Settings → Secrets and variables → Actions)
############################################################

# [REQUIRED] Postgres connection via SESSION POOLER (GitHub runners are IPv4-only)
# Steps: Supabase → Connect → "Session pooler" → copy URI → replace [YOUR-PASSWORD]
#        (reset it in Project Settings → Database if forgotten)
SUPABASE_DB_URL=

# [REQUIRED] Cloudflare R2 (backup storage)
# Steps: 1) Cloudflare → R2 → create bucket  2) R2 → Manage API tokens → Create (Object Read & Write,
#        limited to the bucket)  3) copy Access Key ID, Secret, and the S3 endpoint
#        https://<ACCOUNT_ID>.r2.cloudflarestorage.com ; Account ID is on the R2 overview page
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=
BACKUP_RETENTION_DAYS=30

# [REQUIRED] Heartbeat so the dashboard shows "last backup"
BACKUP_HEARTBEAT_URL=
BACKUP_HEARTBEAT_SECRET=

# [OPTIONAL] CI deploys
# SUPABASE_ACCESS_TOKEN → supabase.com/dashboard/account/tokens
# SUPABASE_PROJECT_REF  → the code in your project URL
# SUPABASE_DB_PASSWORD  → Project Settings → Database
# CLOUDFLARE_API_TOKEN  → Cloudflare → My Profile → API Tokens → Create (Cloudflare Pages: Edit)
# CLOUDFLARE_ACCOUNT_ID → Cloudflare dashboard sidebar
SUPABASE_ACCESS_TOKEN=
SUPABASE_PROJECT_REF=
SUPABASE_DB_PASSWORD=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
```

### 7.2 Dev mode
`SMS_DRIVER=console` and a stubbed AI (`AI_DRIVER=fixture`, returns canned extractions from `tests/fixtures/bills/`) must make the **entire app testable without MSG91, Anthropic or Resend keys**. Never log OTPs or API keys in production.

---

## 8. HUMAN GATES (the only places you may stop and ask)

Do other work while a gate is pending. Write each as a numbered simple-words checklist in `docs/SETUP.md`.

| # | Gate | Human does |
|---|---|---|
| G0 | Brand + domain | Choose the name, buy the domain, confirm the final domain (passkeys are tied to it). Before G3. |
| G1 | MCP restart | After Phase 0 writes `.mcp.json`: restart Claude Code, run `/mcp`, confirm `shadcn` is Connected. |
| G2 | Supabase + Google | Two Supabase projects (dev, prod); Google OAuth client (keys in section 7). |
| G3 | MSG91 + DLT | Entity, sender ID, OTP template, approval, keys. |
| G4 | Cloudflare | Pages project, Turnstile widget, R2 bucket + token. |
| G5 | GitHub | Private repo + secrets. |
| G6 | Accounts for AI + email | Anthropic key with spend limit; Resend domain verified. |
| G7 | Pilot data | Tenant #1 Excel list; 15–20 real sample bills, UPI screenshots and a bank statement (CSV/Excel) from the mess for accuracy tests; one real hostel's data and rooms. |
| G8 | Legal | Lawyer reviews `/terms`, `/privacy`, listing rules, takedown process, AI-processing disclosure. |

---

## 9. Information architecture (sitemap, tabs, home page)

### 9.1 Public routes
`/` home · `/explore` (filters, list + map toggle) · `/hostels`, `/messes` (shortcuts to `/explore?type=…`) · `/p/:slug` place page · `/p/:slug/join` request to join · `/c/:city` city landing pages (data-generated) · `/compare?ids=` · `/for-owners` pitch page · `/demo` interactive demo (client-side fixtures, read-only) · `/list-your-place` owner wizard · `/login` · `/help` · `/privacy`, `/terms`, `/about` · `/j/:slug` QR entry (opens the place page with the join action).

### 9.2 Logged-in routes
- **Customer `/me`**: Home (my places, status, card) · Requests · Payments · Saved · Notifications · Profile.
- **Owner/manager `/app/:slug`**: Today · Inbox · Members · Rooms (hostel) / Menu (mess) · Money · Team · My public page · Notices · Reports · Settings.
- **Platform `/admin`**: Tenants · Listings review · Reports · Health.

### 9.3 Navigation
- **Public header:** logo · Explore · Hostels · Mess & Food · For Owners · Login (mobile: hamburger sheet with the same links). Owners are secondary: one link and one strip, not the main message.
- **Customer mobile:** bottom nav Home · Explore · Requests · Alerts · Profile.
- **Owner mobile:** bottom nav Today · Inbox · **[ + ]** · Members · More. The **+** opens a quick-actions sheet: *Add expense (photo/voice/quick)*, *Record cash received*, *Add member*, *Post notice*, *Pay salary*. Laptop: shadcn `sidebar`; place switcher in the header.

### 9.4 Home page (`/`) — customer first
1. **Hero:** headline "Find a hostel or mess you can trust: real seats, real menus, real prices." Search bar (city / area / college with autocomplete from data) + type tabs (Hostel · Mess · PG · Tiffin) + button. Quick chips: Boys hostel · Girls hostel · Veg mess · Under ₹5,000 · AC rooms · Near me.
2. **Live strip:** real counts ("N places · M beds free today"); show only when numbers are meaningful.
3. **Near you / Featured:** place cards (cover photo, type + audience chip, area, "from ₹X/mo", availability badge, Verified tick).
4. **Today's menus:** a scrolling row of mess menus for today.
5. **Why it's different:** live availability · menus by owners · transparent prices · no brokers.
6. **How it works:** Search → Request → Move in (3 steps, animated).
7. **Popular areas / colleges** grid linking to `/c/:city`.
8. **Owner strip:** "Run a hostel or mess? Free tools: seats, menus, fees, expenses, salaries →" linking to `/for-owners`.
9. FAQ, footer (Terms, Privacy, Report a listing, Contact).
Fast, prerender-friendly, strong SEO, light and dark, perfect at 360 px.

### 9.5 `/for-owners` (the pitch page; must sell by itself)
Hero with the promise "Run your hostel or mess in 10 minutes a week" · **Money-leak calculator** (inputs: members, monthly fee, hours/day on the book, % paying late → shows hours and rupees lost per year; clearly illustrative) · **Book vs us** scroll animation (paper register becomes the live dashboard) · **"Photograph your register" demo** explanation · feature sections by pain (Customers, Money in, Money out, Team, Your public page) · "Try the demo" (links `/demo`) · how it works · FAQ · CTA "List your place free". No pricing numbers; say "Free during pilot".

### 9.6 `/demo`
Client-side fixtures through the same UI components, read-only, with a switch: Boys hostel / Girls hostel / Mess. Banner: "Demo data". No database access.

---

## 10. Database

Enable RLS on **every** table in `public`. Money columns end in `_paise` (bigint). All schema in `supabase/migrations/`. Dev seed: 3 demo tenants (mess, boys hostel, girls hostel) with realistic members, rooms, menus, bills, payments, employees; plus 2 extra "other tenant" fixtures for isolation tests.

### 10.1 Identity and tenancy
- **`profiles`**: `user_id` (auth), `full_name`, `email`, `phone` (verified, mirrors auth), `language`, `created_at`.
- **`tenants`**: `id`, `slug` (unique, 3–30 chars `a-z0-9-`, reserved words blocked, **immutable**), `name`, `business_type`, `status` (trial|active|suspended|closed), `plan_tier`, `max_members`, `trial_ends_at`, `logo_path`, `brand_color`, `city`, `contact_phone`, `timezone`, `support_access_until`, `is_demo`, `created_by`, `created_at`, `closed_at`.
- **`tenant_settings`**: labels (member singular/plural), `modules text[]` (`rooms`, `charges`, `notices`, `menu`, `money`, `team`), `join_policy` (`approve_unlisted`|`listed_only`), `grace_days`, `expiring_soon_days`, `default_language`, `reminder_templates jsonb`, `upi_ids jsonb` (list of {vpa, label, default}), `payment_instructions text`, `weekly_close_day`/`time`.
- **`tenant_staff`** (`tenant_id`, `phone`, `user_id`, `role` owner|manager; unique per phone), **`platform_admins`**, **`platform_settings`**, **`tenant_usage`** (counters for quotas).

### 10.2 Public place profile (marketplace)
- **`place_profiles`** (1:1 tenant): `headline`, `about`, `audience` (boys|girls|coed|any), `visibility` (private|listed), `moderation_status` (draft|pending|approved|rejected|suspended), `verified_level` (none|verified), `verified_at/by`, `address_full`, `area`, `landmarks jsonb`, `lat`, `lng`, `geog` (PostGIS, generated), `address_public_level` (area_only default | full), `contact_mode` (request_only default | show_phone), `public_phone`, `rules text`, `amenities text[]` (wifi, AC, geyser/hot water, laundry, CCTV, power backup, parking, RO water, lift, housekeeping…), `food_info jsonb` (veg/non-veg/both, meals included, timings), `cover_photo_id`, `availability_updated_at`, cached `min_price_paise`, `beds_total`, `beds_free`, `search tsvector`, `slug` via tenant.
- **`place_photos`** (`path`, `sort`, `alt`, `kind` room|common|food|building|other), max 12 per place.
- **`room_types`**: `name` ("Single", "2-sharing", "3-sharing", "Dorm"), `beds_per_room`, `ac`, `attached_bath`, `monthly_price_paise`, `deposit_paise`, `description`, `photo_ids`, `active`.
- **`floors`** (`label`, `sort`), **`rooms`** (`floor_id`, `label`, `room_type_id`, `capacity` (defaults from type), `blocked_beds`, `active`, `notes`), **`bed_assignments`** (`room_id`, `member_id`, `bed_label`, `from_date`, `to_date`).
- **Mess/tiffin:** `menu_templates` (`meal` breakfast|lunch|snacks|dinner, `weekday` 0–6, `items text[]`, `veg_type`, `notes`), `menu_overrides` (`date`, `meal`, `items`, `closed`, `note`), `meal_timings jsonb` in place_profiles, `meal_plans` use `plans` (so plan prices appear publicly when flagged `public`).
- **`place_reports`** (abuse reports: reason, details, reporter user nullable, status), **`moderation_events`**.
- **Public views / RPCs (explicit columns only):** `public_place_cards`, `public_place_detail(slug)`, `public_room_types(slug)` (with live `beds_free`), `public_menu(slug, date)`, `public_place_meta(slug)`, `search_places(q, type, audience, city, area, min_price, max_price, amenities[], veg, only_available, lat, lng, radius_km, sort, cursor)`. Only `moderation_status = 'approved' AND visibility = 'listed' AND tenant.status in ('trial','active')` rows are visible to `anon`. `area_only` places expose a **coarsened coordinate** (rounded to ~300 m grid) and no street address.

### 10.3 People and billing
- **`plans`**: `name`, `price_paise`, `period_unit` (day|week|month), `period_count`, `due_rule`, `description`, `public` bool, `is_default`, `archived_at`.
- **`members`**: `phone`, `name`, `user_id null`, `plan_id`, `approval_state` (approved|pending|rejected), `created_via` (import|request|manual), `joined_on`, `billing_start`, `left_on`, `photo_path`, `photo_locked`, `custom jsonb`, `consented_at`, `profile_completed_at`, `paused_at`, `removed_at`, `phone_history jsonb`, `notes`, `code` (short unique member code, e.g. `K7P2`, used as UPI note reference). Unique (`tenant_id`,`phone`); unique (`tenant_id`,`user_id`) where not null.
- **`join_requests`**: `tenant_id`, `user_id`, `status` (pending|approved|rejected|waitlisted|withdrawn|expired), `message`, `preferred_room_type_id`, `move_in_date`, `visit_on`, `decision_by/at`, `decision_note`, `created_at`. Limits: 5 new requests per customer per day; one open request per place.
- **`field_definitions`**, **`member_unique_values`**, `validate_custom()` — as in the custom-fields design: fields have `key`, `label`, `type` (text|number|select|date|phone|yesno|textarea), `options`, `required`, `unique_in_tenant`, `collect_from`, `member_can_edit`, `show_on_card`, `show_in_list`, `sort`, `archived_at`. Forms, tables, template and export are generated from them. Max 3 `show_on_card`.
- **`charges`** (deposit|fee|penalty|other; open|paid|waived), **`notices`**.

### 10.4 Payments from customers
- **`payment_claims`**: `member_id`, `amount_paise`, `method` (upi|cash|bank|other), `reference` (UTR/ref), `paid_at_claimed`, `screenshot_path`, `screenshot_sha256`, `ai_extract jsonb` (amount, utr, payee, vpa, datetime, status, confidence), `checks jsonb` (amount_match, payee_match, date_ok, duplicate_utr, duplicate_image), `status` (submitted|confirmed|rejected|needs_info|stale), `decided_by/at`, `decision_note`, `transaction_id`. Max 3 open claims per member; claims go stale after 14 days.
- **`payments`** (member subscription/extension/charge/deposit_refund; `period_start/end`, `transaction_id`, `source`, `voided_at`) always created together with a `transactions` row in one SQL function.

### 10.5 Finance
- **`accounts`** (`kind` cash|upi_bank, `label`, `upi_vpa`, `opening_balance_paise`, `opening_on`).
- **`categories`** (tree; `kind` income|expense|investment; `key`, `label` English + Telugu, `icon`, `color`, `system` bool, `preset_key`, `archived_at`). Presets per business type (section 17.3).
- **`parties`** (vendors/utilities/landlord/others: `name`, `kind`, `default_category_id`, `trust_count`, `auto_confirm` bool, `gstin`, `notes`), **`party_aliases`** (`alias_norm`, `vpa`, `party_id`, `member_id`, `employee_id`) — the "teach once" memory.
- **`transactions`**: `direction` (in|out), `kind` (member_payment|expense|salary|advance|investment|deposit_in|deposit_out|transfer|adjustment|owner_draw|other_income), `account_id`, `category_id`, `party_id`, `member_id`, `employee_id`, `amount_paise`, `occurred_on`, `description`, `status` (draft|confirmed|void), `source` (manual|capture|claim|statement|recurring|system), `capture_id`, `claim_id`, `payable_id`, `utr`, `confidence`, `dedupe_key`, `tags text[]` (e.g. `no_bill`), `reversed_of`, `voided_at`, `void_reason`, `month_closed bool`, `created_by`.
- **`captures`** (one upload batch: `status` uploaded|processing|extracted|needs_review|confirmed|failed|discarded, `hint_category_id`, `paid_by_hint`, `extraction jsonb`, `field_confidence jsonb`, `warnings`, `model`, `tokens`, `error`, `created_by`), **`capture_files`** (`path`, `mime`, `bytes`, `sha256`, `page_count`, `doc_type`).
- **`bill_items`** (`transaction_id`, `name`, `name_norm`, `qty`, `unit`, `rate_paise`, `amount_paise`) → powers price watch.
- **`payables`** (`party_id`, `bill_no`, `bill_date`, `due_on`, `amount_paise`, `paid_paise`, `status` open|partial|paid|void, `capture_id`).
- **`recurring_rules`** (`category_id`, `party_id`, `expected_day`, `amount_min/max_paise`, `auto_draft` bool, `last_seen_month`).
- **`month_closes`**, **`cash_counts`** (`counted_on`, `counted_paise`, `expected_paise`, `diff_paise`), **`assets`** (`name`, `purchased_on`, `cost_paise`, `transaction_id`, `notes`), **`documents`** (vault: `kind`, `title`, `file_path`, `number`, `expires_on`, `remind_days`).
- **`bank_statements`** (`file_path`, `account_id`, `from`, `to`, `status`, `rows`), **`statement_lines`** (`date`, `narration`, `debit/credit_paise`, `balance_paise`, `utr`, `counterparty_raw`, `match_status` (auto|suggested|unmatched|ignored), `matched_transaction_id`).
- **Summaries:** `finance_month_summary` (tenant, month, income, expense, investment, by-category jsonb), `place_daily_stats`.

### 10.6 Team
- **`employees`**: `name`, `phone`, `role` (cook, helper, server, cleaner, security, warden, manager, other), `photo_path`, `joined_on`, `left_on`, `pay_type` (monthly|daily), `rate_paise` (monthly salary or daily wage), `proration_rule` (`calendar_days`|`fixed_30`|`working_days`), `weekly_off int[]`, `weekly_off_paid bool`, `payout_day` (default 1), `active`, `notes`.
- **`employee_absences`** (`date`, `kind` full|half|paid_leave, `note`), **`employee_adjustments`** (`kind` advance|bonus|deduction|overtime, `amount_paise`, `on_date`, `recover_in` (next_payout|installments), `installments`, `settled_payout_id`), **`payouts`** (`employee_id`, `period_month`, `days_payable`, `gross_paise`, `adjustments_paise`, `net_paise`, `status` draft|due|paid, `paid_on`, `transaction_id`, `breakdown jsonb`).

### 10.7 Platform and notifications
- **`notifications`** (`user_id`, `tenant_id`, `type`, `title`, `body`, `data jsonb`, `url`, `read_at`, `created_at`), **`push_subscriptions`**, **`notification_prefs`**, **`jobs`**, **`ai_usage`**, **`passkeys`** (per person), **`webauthn_challenges`**, **`card_unlocks`**, **`import_batches`**, **`import_changes`**, **`audit_log`**, **`sms_log`**, **`system_events`**.

### 10.8 View `member_overview` (`security_invoker`)
Per member: `last_paid_on`, `due_on`, `days_left`, `sub_status` (`removed`, `former`, `paused`, `no_payment`, `expired`, `expiring_soon`, `active`), `open_charges_paise`, `deposit_held_paise`, `room_label`, `open_claim`. Rules: `due_on = max(period_end)` over non-voided subscription/extension payments, else `billing_start`. Period on a new payment: `from_payment_date` → `period_start = paid_on`; `from_previous_due` → previous `due_on` (or `billing_start`, or `paid_on`); `period_end = period_start + interval`. "Collected this month" excludes deposits.

### 10.9 Functions (all `security definer`, `set search_path = ''`, explicit role + tenant checks, each writes `audit_log`)
Helpers: `normalize_phone`, `tenant_today`, `is_platform_admin`, `is_staff(tenant, role)`, `is_member_of`, `verified_phone()` (reads the **confirmed** phone from the JWT/auth user and raises if absent).
Tenant: `create_tenant` (rate-limited), `slug_available`, `link_my_memberships`, `invite_staff`, `remove_staff`, `submit_for_listing`, `report_place`.
Join: `request_to_join(slug, ...)` (auto-approve if the verified phone is on the imported list; else pending), `decide_join_request(id, decision, note)`, `withdraw_request`.
Members/money: `complete_profile`, `approve_member`, `link_pending_to_member`, `set_paused`, `remove_member`, `set_photo_lock`, `check_out_member`, `submit_payment_claim`, `decide_payment_claim` (confirm / reject / needs_info; creates payment + transaction atomically; supports partial amount), `mark_paid` (owner records directly, e.g. cash), `extend_plan`, `void_payment`, charges functions, `assign_bed`, `move_bed`, `recompute_availability(tenant)`.
Finance: `confirm_capture`, `merge_transactions`, `void_transaction`, `create_payable`, `pay_payable`, `close_month`, `reopen_month`, `record_cash_count`, `apply_statement_matches`.
Team: `compute_payout(employee, month)` (pure SQL or typed TS shared with tests), `create_payouts_for_month`, `mark_payout_paid`, `leave_employee`.
Import: `import_members`, `undo_import`.

### 10.10 RLS and storage
- **anon:** only the public views/RPCs above. Nothing else.
- **Customer:** own profile, own member rows, own payments/claims/charges/join requests/notifications, own bed assignment; tenant public info and notices of places they belong to. Writes only through functions.
- **Staff of tenant T:** read rows with `tenant_id = T`; writes via functions per the matrix. **Finance and employees (`transactions`, `captures`, `parties`, `payables`, `employees`, `payouts`, `bank_statements`, `documents`, summaries) are owner-only by default**, with a per-manager setting `can_see_money` (default false).
- **Platform admin:** tenant metadata, aggregates, listing moderation. **No member or finance PII** unless the tenant set `support_access_until` in the future; every such read is audited.
- Storage buckets: `member-photos` (private, ≤100 KB, signed URLs), `place-photos` (public read, ≤300 KB, webp/jpeg), `tenant-logos` (public), `captures` (private, ≤8 MB, jpeg/png/webp/pdf, signed URLs, path `{tenant_id}/{capture_id}/…`), `claims` (private screenshots), `statements` (private, auto-delete after parsing if the tenant chooses), `documents` (private).

| Action | customer | manager | owner |
|---|---|---|---|
| Browse public pages | ✔ (anyone) | | |
| See own card, payments, notices | ✔ | | |
| Request to join, tap "I paid" | ✔ | | |
| View members, decide join requests, confirm claims, mark paid, assign beds, post notices | | ✔ | ✔ |
| Void payment, remove member, import, export | | | ✔ |
| Money (capture, ledger, reports), Team (employees, payouts), Settings, public page, staff | | optional `can_see_money` | ✔ |

### 10.11 Isolation is a release blocker
`tests/rls` proves for every table, view, function, storage path and public RPC that tenant A cannot read or change tenant B's data and that `anon` can read only public columns of approved listed places. A **schema lint** fails CI if any `public` table lacks RLS/policies, any `security definer` function lacks `set search_path`, any view lacks `security_invoker` (except the explicit public views, which must be allow-listed), or any money column is not `_paise bigint`. Test a person who is a customer in two places and staff in a third.

---

## 11. Auth and identity

1. `/login`: **Continue with Google** (primary) · **Use phone number** (secondary) · Turnstile on OTP screens. Public pages never require login.
2. **Mandatory phone verification:** after Google sign-in, if the account has no confirmed phone, show "Verify your mobile" (phone + 6-digit `input-otp`): `supabase.auth.updateUser({ phone })` then `verifyOtp({ phone, token, type: 'phone_change' })` (confirm against current Supabase docs). Resend after 30 s, max 3 wrong tries, SMS caps apply.
3. **Edge case:** if the phone already belongs to another account, show a clear message ("This number is already used with another sign-in. Log in with phone OTP, or contact support") and log a `system_events` entry. Do not create duplicates silently.
4. Phone-only users may add an email later for notifications.
5. A route guard `RequireVerifiedPhone` protects every non-public route; all SQL functions call `verified_phone()`. **A Google account without a confirmed phone can never link to members, staff or imports.**
6. `sms-hook` (Edge Function, deployed `--no-verify-jwt`): verify the webhook with `standardwebhooks`, per-phone limits (3/hour, 10/day) and `SMS_DAILY_CAP`; `console` driver for dev; `msg91` driver per MSG91's current API (read their docs); never log the OTP when `msg91`; mask phones.
7. After login: `link_my_memberships()` links all imported member/staff rows that match the confirmed phone. Routing: staff → `/app` (place switcher), customer → `/me`, both → `/me` with sections. Long-lived sessions. Profile prefill: name and email from Google; the ID photo is always a fresh selfie.

---

## 12. Marketplace (public side)

### 12.1 Explore
`/explore`: filters (type, audience, city/area, price range, amenities, veg/non-veg, "only with free beds", room type, distance), sort (nearest, price low→high, most beds free, recently updated), list + map toggle, cursor pagination, URL-synced filters, skeletons, empty state with "Notify me" (saves search for a customer; optional). "Near me" uses browser geolocation only after the user taps it.
Place card: cover photo, name, type/audience chip, area, "from ₹X/mo", availability badge ("5 beds free" · "Full, join waitlist" · "Ask owner"), Verified tick, key amenity icons, Save (heart; anonymous saves in local storage, merged after login), Compare checkbox (up to 3).

### 12.2 Place page `/p/:slug`
Sticky section tabs: Overview · Rooms & prices · Facilities · Food & menu · Rules · Location · Photos. Sections:
- Gallery, headline, audience, area, verified badge with an explanation, last-updated.
- **Rooms & prices:** each room type with price, deposit, AC/bath, beds free now, "Request this".
- **Food & menu:** today's menu (live) + weekly table; meal timings; veg/non-veg; plan prices (`plans.public`).
- **Facilities, Rules** (curfew, visitors, notice period).
- **Location:** approximate map for `area_only`, exact map and "Open in Google Maps" for `full` or after approval.
- Contact: only "Request to join" by default (`contact_mode`), optional public phone.
- Mobile sticky bottom bar: **Request to join** · Save · Share (WhatsApp deep link + copy).
- "Report this listing" (reason list). Structured data (JSON-LD) and OG tags (12.7).

### 12.3 Compare `/compare`
Side-by-side table (price, room types, beds free, amenities, distance, rules) for up to 3 places.

### 12.4 Availability that stays honest
- `beds_free` per room type and place = capacity − active `bed_assignments` − `blocked_beds`, recomputed by `recompute_availability` on any bed change (trigger). Mess "seats" = optional `max_members` − active members.
- Show "Updated X ago" from `availability_updated_at`. The owner gets a weekly one-tap "Is availability still correct? ✔" notification (resets the timestamp). If older than 14 days, hide exact counts and show "Ask owner". A place with no rooms configured shows no availability at all.

### 12.5 Trust and safety
- Listing flow: owner completes the profile → **Submit for listing** → `pending` → platform admin reviews a checklist (real photos, plausible prices, contact verified by a call, no resident faces, no misleading claims) → `approved` (+ optional **Verified** after an actual check) or `rejected` with reasons. Owners can set `visibility = private` anytime (still reachable by their QR link for joining).
- **Girls' hostels / coed:** default `address_public_level = area_only`; exact address, exact pin and phone are revealed to a customer only after the owner approves their request (or confirms a visit). Photo rules: no identifiable residents.
- Report button on every place; admin queue; actions: dismiss, warn, suspend listing. Repeat abuse suspends the tenant.
- Anti-scraping: rate-limit public functions (Cloudflare), no bulk export, phones not in HTML unless `show_phone`.
- 18+ confirmation in the join flow and Terms.

### 12.6 Search implementation
`tsvector` over name/area/landmarks/amenities + `pg_trgm` for fuzzy area/college names + PostGIS distance. A `search_places` RPC with an index per filter. Autocomplete suggests cities, areas and landmarks present in approved listings.

### 12.7 SEO and sharing
- Cloudflare Pages Function for `/p/:slug` fetches `public_place_meta` and injects `<title>`, meta description, canonical, OG/Twitter tags (cover photo), and JSON-LD (`LodgingBusiness` for hostels, `FoodEstablishment` for messes) into the SPA HTML using `HTMLRewriter`; 404/410 for unapproved places.
- `/sitemap.xml` generated by a Pages Function from approved listed places and `/c/:city` pages; `robots.txt` allows `/`, `/explore`, `/p/*`, `/c/*`; disallows `/app`, `/me`, `/admin`.
- Prerender `/`, `/for-owners`, `/privacy`, `/terms`, `/about` at build time.
- Link previews must look good in WhatsApp (verify with the OG tags).

---

## 13. Joining a place, and notifications

### 13.1 Customer journey
1. Browse → **Request to join** on a place page (or open `/j/:slug` from the owner's QR).
2. Not logged in → Google + phone verification (11), then return to the same page.
3. Short form: name (prefilled), preferred room type (hostel), preferred plan (mess), move-in date, optional visit date, optional message, 18+ confirmation, consent to share name/phone with the owner. The tenant's custom fields come **after approval**, not here.
4. Confirmation screen: "Sent. The owner usually replies within X." Status lives in `/me/requests`.
5. If the verified phone is on the owner's imported list → **auto-approved**, go straight to onboarding.
6. On approval: onboarding (photo selfie, custom fields generated from `field_definitions`, consent), room assignment (hostel), payment instructions (UPI ID, QR, "Open UPI app" deep link best effort, copy button, reference code = member `code`). On rejection/waitlist: message with the reason or position.

### 13.2 Owner journey
Request arrives as a notification and in **Inbox → Requests**: card with name, verified phone, message, preferred room type with beds free, buttons **Approve** (choose room/bed + plan, one screen) · **Waitlist** · **Reject** (reason chips) · **Call** · **WhatsApp** (wa.me link). Bulk actions. Link to existing member if the person is already imported under another number.

### 13.3 Notifications (in-app + web push + email)
- `notifications` table + Supabase Realtime subscription (bell with unread count, list page, mark all read, deep links).
- Web Push with a service worker (VAPID). Ask permission only **after a meaningful action** (e.g. after the first request/approval), never on first load. iOS: show an "Add to Home Screen" helper explaining push works only when installed.
- Email (Resend) for key events: request decided, claim decided, first-time welcome, weekly digest (opt-out).
- Types: `join_request_new`, `join_request_decided`, `payment_claim_new`, `payment_claim_decided`, `member_expiring`, `capture_ready`, `bill_expected_missing`, `payout_due`, `document_expiring`, `availability_check`, `weekly_close`, `backup_stale`, `listing_decided`, `report_new` (admin).
- Preferences per user and per type/channel; quiet hours (22:00–07:00 IST) for push except urgent.
- `notify` Edge Function drains the `jobs` queue; failures retry; invalid push subscriptions are pruned.

---

## 14. Customer experience (kept at zero)

- Home: status block, due date and days left, notices, room info, saved places, card button.
- **"I paid" (monthly, optional):** Pay screen shows amount due, the owner's UPI ID(s), QR, reference code, "Open UPI app" (best-effort `upi://pay` link; if the amount-prefilled link to a personal UPI ID is blocked by apps/banks, show the fallback copy/QR, and record what you observed in `DECISIONS.md`). After paying: **I paid** → method (UPI / Cash / Bank) → amount (default due) → optional UTR + screenshot. Client compresses the screenshot; server stores it, computes a SHA-256, and a job extracts amount/UTR/payee/date for cross-checks. Status chips: Submitted → Confirmed / Rejected (with reason) / Needs info. The card turns green only after the **owner confirms**.
- Payments history, profile (read-only after approval), notifications, language switch (English/Telugu).
- No daily screens. No attendance. No menus to fill.

---

## 15. The fingerprint-locked ID card (customers and staff)

- **Enable once per person:** `authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' }`, single-use 2-minute challenge, verify origin and rpID. Max 1 active passkey per person; replacing needs a fresh OTP login (≤5 min), revokes the old one, audits, and flags "device changed" to staff. No WebAuthn → show the card with an **"Unprotected device"** badge flagged to staff.
- **Unlock each time:** `startAuthentication` with `userVerification: 'required'` → `card` function verifies signature, counter, challenge, origin; inserts `card_unlocks`; returns name, signed photo URL (~90 s), up to 3 `show_on_card` fields, status, due date, `server_now`, `valid_until = server_now + CARD_UNLOCK_SECONDS`. Client locks exactly then (blur + clear state). Use server time.
- **Design:** place logo/name, tenant brand colour (8 contrast-checked swatches), **big name**, photo, large colour-coded status block (green Active · amber Expiring in N days · red Expired/Overdue · grey Paused/Former), "Valid till 5 Nov 2026", live ticking server-synced clock, circular countdown ring, subtle shimmer (respect `prefers-reduced-motion`), sunlight-readable, light + dark.
- **Staff flags:** unlocked from more than one passkey in 24 h; re-registered ≥ 2 times in 30 days; unprotected device.
- **Employee ID card:** printable/PDF and on-screen card (name, photo, role, place, "working since", employee code, QR-less). Employees do not log in; the owner can print it, or share an image link that shows the card read-only (unguessable token, revocable, shows no phone number). Purpose: let residents and security recognise real staff.

---

## 16. Owner app (`/app/:slug`)

All labels use the tenant's words. Owners mostly use a phone: mobile-first. Every common action ≤ 2 taps; optimistic updates with rollback; Ctrl/Cmd+K palette on laptop; skeletons, empty and error states.

1. **Today:** the 10-second screen: money in this month, pending to collect, claims waiting, requests waiting, expiring soon, tomorrow's headcount hint (mess, from member count and pauses), beds free, bills to review, backup status, and the **value counter** ("hours saved, dues recovered this month", clearly estimated).
2. **Inbox:** one list of everything needing a decision, grouped: Join requests · Payment claims · Capture drafts (bills) · Unknown payers (statement) · Expected bills missing · Availability check · Documents expiring. Bulk-confirm for all-green items.
3. **Members:** searchable table (columns from `show_in_list`), status filters, row actions: Mark paid (drawer; date default today; method; 10 s undo), Extend, Pause/Resume, Call (`tel:`), WhatsApp reminder (`wa.me` prefilled from the template), Edit, Change plan, Unlock photo, Check out/Remove; flags; mobile cards with a bottom sheet.
4. **Reminder queue:** one-tap flow through due/overdue people (WhatsApp deep link → Next); counters. Also **auto in-app push reminders** to customers on the ladder: 3 days before, due day, +2 days (sent through web push/email where available). The owner only handles the final "N people still need a call".
5. **Rooms (hostel):** floors → rooms → beds grid, bulk creation, assign / move / vacate, check-in / check-out, deposits and settlement statement (deposit − dues − damages = refund), occupancy, vacancy forecast.
6. **Menu (mess/tiffin):** weekly template editor (7 days × meals; items as chips from a reusable "dish library" the owner builds once), overrides for holidays/specials, meal timings; shows exactly what the public sees.
7. **My public page:** editor with live preview: headline, about, photos (drag to reorder, compress client-side to WebP ≤ ~200 KB), audience, amenities chips, rules, food info, location pin picker (OSM), address privacy level, contact mode, room types and public plans, **Submit for listing** / **Hide**, completeness meter ("80% complete: add photos").
8. **Money, Team, Notices, Reports, Import/Export, QR poster, Settings, Staff, Audit, Backups/Safety** — Money and Team in sections 17–18; the rest as below.
9. **Weekly Close** (`/app/:slug/close`): a guided stepper that lists, in order, claims to confirm, drafts to review, unknown payers, cash count, absences for the month (on month end), missing expected bills, availability check. Each step is skippable and shows time estimates. A Friday 18:00 IST notification opens it. This is the owner's whole routine.
10. **Reports:** collections, dues, occupancy, member list, P&L (section 17); all export to Excel.
11. **QR poster:** QR → `APP_URL/j/slug?src=qr`, A4/A5 printable poster (place name, "Scan to see seats, menu, join", English + Telugu), downloadable PNG/SVG, share link.
12. **Settings:** profile & branding, plans, fields, modules, join rules, UPI IDs & payment instructions, grace days, reminder templates, language, labels, usage & quotas (members, storage, AI docs), notification preferences, staff (invite manager by phone; `can_see_money` switch), **Close my account** (full export first).

---

## 17. Money: Smart Capture and the ledger (the core of the finance side)

### 17.1 What the owner does (capture UX)
Big **+** → **Add expense**:
1. **Pick a category chip** (optional; "Not sure" is fine): Vegetables · Groceries · Gas · Electricity · Water · Milk · Rent · Repairs · Internet · Cleaning · Transport · Salary (opens Team) · Other (+ preset-specific chips).
2. **Add proof:** camera, gallery, PDF, **multi-select**, or **Share to app** (PWA Web Share Target from the gallery/WhatsApp). Several files can be one expense (bill + payment screenshot) or many.
3. Optionally say how it was paid: Cash · UPI · Bank · Not paid yet (credit). AI fills this when visible.
4. Done: files upload immediately (resumable, compressed), the owner can **leave**; processing is a background job; a push/in-app notification says "5 bills ready".
5. **Confirm card** per draft: vendor (chip picked from learned vendors), date (picker), amount (large number), category chip, paid-by chip, items (collapsed), proof thumbnail, confidence bar, warnings. **Confirm** (one tap) · Edit by tapping fields · Split · Discard. "Confirm all green" in bulk.
Alternative entries: **Quick add** (category chip + amount keypad + paid-by chip; 3 taps), **Voice** (Web Speech API, `te-IN`/`en-IN`; feature-detect, hide the mic if unsupported): "ఈరోజు కూరగాయలు 2300, గ్యాస్ 1100" becomes drafts via a text-only LLM parse. Voice is best-effort and always shows drafts for confirmation.

### 17.2 Cases that must be handled (write fixture tests for each)
| # | Case | Expected behaviour |
|---|---|---|
| 1 | Printed itemised shop bill | vendor, date, bill no., items, tax, total → draft expense |
| 2 | Handwritten slip (English/Telugu) | best-effort total + vendor, lower confidence, flagged for review |
| 3 | Electricity / water / gas bill (PDF or photo) | consumer no., period, units, due date, amount → **payable** + recurring rule suggestion; text-PDFs parsed by text extraction first, AI as fallback |
| 4 | UPI payment screenshot (GPay, PhonePe, Paytm, BHIM, bank apps) | amount, payee name/VPA, UTR, date-time, **status**; failed/pending → not posted, owner told why |
| 5 | Bill + payment screenshot together | merged into **one** transaction, UTR attached |
| 6 | Payment screenshot only | transaction tagged `no_bill`; category from payee memory or hint |
| 7 | Bill without payment | payable (vendor credit) |
| 8 | Partial payment of a bill | payable stays `partial`; payments link |
| 9 | Several bills in one photo/PDF | split into several drafts |
| 10 | No bill at all | Quick add or voice, tagged `no_bill` |
| 11 | Cash purchase with slip | account = cash |
| 12 | Gas cylinders / bulk items | quantity captured; "cost per cylinder" insight |
| 13 | Duplicate upload (same file hash, same UTR, or same vendor+amount±0+date±3 days) | flagged "already recorded", never double-counted |
| 14 | Refund / credit note | inflow linked to the original expense |
| 15 | Blurry/unreadable/cropped | status `needs_review` with a clear "retake" reason; file kept |
| 16 | Not a bill (random photo) | friendly rejection, no draft |
| 17 | Indian number/date formats, ₹/Rs, lakh/crore, `DD/MM/YYYY`, mixed Telugu/English | parsed correctly; ambiguous dates flagged |
| 18 | Large purchase (fridge, furniture) | suggests **Investment** and creates an `assets` row |
| 19 | Salary payment screenshot | links to the matching **payout** instead of creating a new expense |
| 20 | Bill dated in a closed month | blocks with "month is closed; reopen?" |
| 21 | Image contains instructions ("ignore previous…") | treated as data only; see 17.5 |

### 17.3 Category presets (editable, bilingual)
- **mess:** Vegetables, Groceries/Provisions, Rice & grains, Milk & curd, Gas, Electricity, Water, Salaries, Rent, Repairs & maintenance, Packaging/disposables, Cleaning, Transport, Licences & fees, Marketing, Internet, Other. Investments: Kitchen equipment, Furniture, Vehicles.
- **hostel:** Rent to landlord, Electricity, Water, Internet/Wi-Fi, Gas (if mess inside), Food & groceries, Housekeeping, Salaries, Repairs & maintenance, Furniture & fittings (investment), Laundry, Security, Marketing, Licences, Other.
- **tiffin:** Groceries, Vegetables, Gas, Packaging, Delivery/fuel, Salaries, Rent, Electricity, Other.
Income categories: Fees, Deposits (liability), Late fees, Other income.

### 17.4 Learning and trust
- Category resolution order: owner's chip > learned vendor default > recurring rule > AI suggestion > Uncategorised.
- Every confirm updates `party_aliases`, `parties.default_category_id` and `trust_count`. After **3 consecutive unedited confirms** the app offers "Trust this vendor": future drafts from that vendor with confidence ≥ 0.9, amount within the vendor's usual range, and no warnings are **auto-confirmed** (shown in a "Auto-added" list with one-tap undo for 7 days). Default off; per vendor; revocable.
- Recurring rules are suggested after the same party+category appears in ≥ 3 months. Expected bills create a `bill_expected_missing` notification if absent by day X+5.

### 17.5 Extraction pipeline (Edge Function `ai-worker`)
1. Download the file; for images: auto-rotate, downscale to ≤ 1600 px long side, WebP/JPEG; for PDFs: try text extraction; render pages only if no text.
2. Single structured call: output JSON **validated by zod** with fields `doc_type`, `vendor{name, vpa, gstin}`, `bill_no`, `bill_date`, `due_date`, `period{from,to}`, `total_paise`, `tax_paise`, `paid_paise`, `payment{method, utr, status, paid_at, payee_vpa}`, `items[]`, `suggested_category_key`, `language`, `field_confidence`, `warnings`.
3. Sanity checks in code: items sum vs total (tolerance), date plausible (not future, ≤ 18 months back), amount > 0, UTR format, UPI `status = success`. Failures lower confidence or add warnings.
4. Low confidence → one retry with `AI_MODEL_STRONG`. Still low → `needs_review`.
5. Merge/dedupe (UTR → hash → heuristic), match to `parties`, resolve category, create **draft** transactions/payables.
6. Record `ai_usage` (calls, tokens, estimated cost). Enforce `AI_DAILY_DOCS_PER_TENANT` and `AI_MONTHLY_DOCS_PER_TENANT`; when exceeded, tell the owner and keep manual entry working.
- **Prompt-injection defence:** document text is untrusted data; the model has no tools and no access to other data; output is schema-validated and never executed; never put other tenants' data in the prompt.
- **Privacy:** only the needed images/text are sent to the provider; disclose AI processing in `/privacy` and in the upload UI; do not send member personal data.

### 17.6 Cash and accounts
Accounts: Cash and UPI/Bank (one or more). **Cash-in-hand check** in Weekly Close: owner enters the counted cash; the app compares it with opening cash + cash in − cash out and records the difference (never auto-fixes). Opening balances are set once in setup.

### 17.7 Recording money from customers
- **From claims:** `decide_payment_claim(confirm)` creates the payment (period maths per due rule), the income transaction, the notification and an audit entry; cash claims are confirmed when the owner actually has the cash.
- **Direct:** `mark_paid` from the member row, or "Record cash received" from the quick-actions sheet (pick a person, amount default = plan price, one tap).
- **Bank statement matching (Phase 9):** the owner uploads a statement (CSV/XLSX, PDF as fallback via AI) at most weekly; lines are matched by UTR first, then learned payer UPI ID/name, then amount + date to open claims/due members; matched claims get a **bank-verified** badge, unmatched lines go to "Who is this?" (answer once → remembered); outgoing lines auto-match to expenses/payouts and propose drafts for unseen ones. Dedupe by UTR/hash; raw file can be deleted after parsing. Start with a flexible column mapper; add bank-specific parsers only for formats seen in the pilot data.

### 17.8 Finance screens (Money)
- **Overview:** the **Profit meter** (Earned · Spent · Profit and %), a month selector, and an animated **Money Map** (Recharts Sankey: customers → UPI/cash → categories → profit).
- **Ledger:** filter by date/category/party/account/status/tags, search, bulk edit category, export.
- **Reports:** monthly P&L (operating vs cash profit), category breakdown, trends (last 12 months), vendor ranking, **price watch** (item price changes over time), **cost per member** and (mess) **cost per plate** estimate, margin per member, payables ageing, salary cost share, investment & payback.
- **Forecast (rule-based, no LLM math):** next month income = Σ active members' plan price × on-time rate from the last 3 months; expenses = recurring rules + trailing-3-month median per variable category + scheduled salaries; show a range and "cash warning" if projected balance dips. A "what if" calculator for fee changes.
- **Insights:** rule-detected alerts ("Vegetables up 22% vs last month", "3 large bills have no category", "Electricity bill not uploaded yet"), narrated by the LLM from computed numbers only.
- **Payables & vendors, Recurring, Categories, Accounts, Assets & investments, Documents vault** (FSSAI/licences/rent agreement with expiry reminders), **Month close** (lock, snapshot, reopen audited), **CA pack** (Excel with P&L, ledger, payables + a ZIP of proofs, per month/quarter/year).

---

## 18. Team (employees)

- **Add:** name, phone, role chip, photo (owner captures), joined date, pay type, rate, proration rule, weekly off (days + paid/unpaid), payout day. The employee does nothing.
- **Pay rules (unit-test heavily, document in `FINANCE_RULES.md`):**
  - Monthly pay = `rate × payable_days / divisor`, where `divisor` = days in that month (`calendar_days`), 30 (`fixed_30`), or working days in the month excluding weekly offs (`working_days`). `payable_days` = days employed in the month (clamped to `joined_on` and `left_on`, inclusive) − unpaid absences (a half day = 0.5), weekly offs counted per `weekly_off_paid`.
  - Example: ₹12,000/month, joined 10 Nov, 30-day month → 21 days (10th to 30th inclusive) → ₹12,000 ÷ 30 × 21 = **₹8,400**, paid on 1 Dec.
  - Daily wage: `rate × days_present` where everyone is present unless an absence is logged (and weekly offs per setting).
  - Round net salary to whole rupees (half up).
- **Attendance by exception:** everyone is present by default. The owner logs an absence (full / half / paid leave) only when it happens, from the employee's page or a calendar tap, or in bulk at the **month-end check** inside Weekly Close ("All present ✔" confirms). No daily marking.
- **Adjustments:** advances (recover next payout or in N installments), bonus, deduction, overtime. Recovery is applied automatically in `compute_payout`.
- **Payout day:** on the payout day (default 1st) the app creates a **draft payout** per employee, notifies the owner "Salaries due: 6 people, ₹52,400", and shows a breakdown card per person. The owner pays by UPI/cash outside the app, then taps **Mark paid** (optionally attaching the payment screenshot; Smart Capture links it to the payout, per case 19). This creates a salary transaction and a payslip.
- **Payslip PDF** (print stylesheet to PDF), **Exit:** `leave_employee(date)` → final payout (pending advances netted), staff card deactivated.
- Staff page shows: status, join date, tenure, total paid this year, advances outstanding.
- Salary data is owner-only (10.10).

---

## 19. Import / export

- **Per-tenant generated Excel template** (exceljs): Name, Phone, Last Paid Date (DD/MM/YYYY), Plan (dropdown), one column per custom field, hostel extras if enabled (Room, Joined On, Deposit Paid); phone as Text; data validation; "Read Me First" sheet and example row (never imported).
- **Browser parsing** of xlsx/csv with a **column-mapping step**, tolerant header matching; dates as real dates, Excel serials or `DD/MM/YYYY` only (never month-first); handle `9.88E+09` phone damage by rejecting it.
- **Validation per row**, **preview with counts and red error rows**, server re-validation, `import_batches` + `import_changes`, **undo latest**, idempotent re-upload, member cap enforcement, unknown rooms offered for creation.
- **Rules:** new phone → member (`created_via='import'`, approved) + a subscription payment from the paid date (amount = plan price, source `import`) + transaction; existing phone → update name; add a payment only if the date is newer; never overwrite what the member filled in.
- **"Photograph your register"** (optional, behind a flag): the owner photographs the paper book; the AI proposes rows (name, phone, dates, amounts) into the same preview/confirm step; accuracy is warned about, the preview catches errors.
- **Exports** (owner only): members, payments, charges, rooms, ledger, payables, payouts, dues, CA pack.

---

## 20. Backups, safety, capacity

1. **Nightly** `.github/workflows/backup.yml` (~02:00 IST): Postgres client matching the server version, `pg_dump` via the **Session Pooler** (roles, schema, data), gzip, upload to **Cloudflare R2**, retention `BACKUP_RETENTION_DAYS`, call `backup-heartbeat`. Fail loudly. Dashboards show "Last backup X hours ago" (red > 36 h). Storage buckets (photos, captures) are listed in the restore doc and, if affordable, mirrored to R2 weekly.
2. **Per-tenant exports** always available; **offboarding:** Close account → export → `closed` → kept 30 days → `scripts/purge-tenant.ts` (audited).
3. `docs/RESTORE.md`: a **tested** restore into a fresh project and a single-tenant restore. Actually test on dev.
4. Soft deletes, voids, `audit_log` for every staff action, month locks.
5. **Capacity (check current limits in Supabase docs):** the free plan has no automatic backups and limited storage/transfer. Photos and bill files are compressed (members ≈ 40 KB, place photos ≈ 200 KB, captures ≈ 200–300 KB). The platform console shows DB size, storage, transfer-heavy buckets, AI usage and SMS usage with warnings at 70%. **Upgrade to Supabase Pro before the first outside paying customer** or at 70% of any limit; write this into `SECURITY.md` and `ADMIN_GUIDE.md`.

---

## 21. Platform admin console (`/admin`)

- **Tenants:** name, slug, type, owner (masked phone), members used/cap, last activity, status, tier; actions: suspend/unsuspend, change cap/tier, extend trial.
- **Listings review:** queue of `pending` places with the checklist from 12.5, approve/reject with reasons, set **Verified**, suspend; **Reports queue**.
- **Health:** capacity meter, last backup, SMS today vs cap, AI usage and estimated cost per tenant, new tenants/listings this week, failed jobs.
- **Privacy:** no member/finance PII without `support_access_until`; audited.
- `docs/ADMIN_GUIDE.md` in simple words.

---

## 22. UI / UX rules (it must look excellent)

### 22.1 shadcn MCP only
All UI comes from **shadcn/ui** (components, blocks, charts) or **Animate UI**, installed through the shadcn MCP. Custom components may only compose installed primitives.
1. `pnpm add -D shadcn@latest`
2. Create `.mcp.json`:
```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```
(Equivalent: `pnpm dlx shadcn@latest mcp init --client claude`.)
3. **Gate G1:** restart Claude Code, run `/mcp`, confirm Connected.
4. Add the Animate UI registry to `components.json` `registries`. **Read https://v1.animate-ui.com/docs/mcp and its installation page for the exact namespace and URL; do not guess.**
5. Before each screen, use the MCP to search/list the shadcn registry and Animate UI, `view` an item to check dependencies, then install. Keep `docs/UI_INVENTORY.md` current.
Likely needs: sidebar, data-table, card, tabs, dialog, drawer, sheet, input-otp, form, input, select, combobox, command, calendar/date-picker, badge, avatar, progress, skeleton, sonner, dropdown-menu, alert-dialog, chart, tooltip, switch, toggle-group (chips), carousel, accordion, breadcrumb, pagination, slider (price range), hover-card, scroll-area, empty/field components; dashboard / login / sidebar / hero / pricing blocks as starting layouts. Animate UI sparingly for polish (counters, tabs, backgrounds, icons).

### 22.2 Themes
Dark and light, default to system, toggle, persisted, no flash. Colours only via tokens; one platform accent (AA in both themes). Tenant brand colour only on the member/staff card and the join/place header, from 8 contrast-checked swatches.

### 22.3 Responsive (mobile first)
Design at 360–390 px first, then 768, then ≥ 1280. No horizontal scroll at 320 px. Touch targets ≥ 44 px, thumb-reachable primary actions, safe-area insets, correct input types and `autocomplete="one-time-code"`, `dvh` units, no layout shift. Tables → stacked cards on small screens; dialogs → bottom drawers on mobile; filter panels → bottom sheets. Telugu text must not clip.

### 22.4 Polish and verification
Restrained motion (all off under `prefers-reduced-motion`); skeletons, empty states, simple-words error messages; WCAG AA; visible focus; keyboard navigation in the owner app. **Verify visually:** Playwright screenshots of every main screen at **375 / 768 / 1280**, light and dark, reviewed and fixed before a phase is done; saved to `docs/screens/`. Budgets: public routes < ~200 KB gzipped JS (lazy-load owner pages, exceljs, charts, maps); Lighthouse mobile ≥ 90 for Performance, Accessibility, Best Practices and SEO on `/`, `/explore`, `/p/:slug`.

### 22.5 PWA and languages
Manifest (both theme colours, maskable icons), `apple-touch-icon`, iOS meta, install helper (explain iOS steps), update prompt, Share Target for images/PDF (opens Smart Capture), offline shell (the card needs network). English + Telugu with a language switch; owner templates bilingual.

---

## 23. Security and privacy checklist

- RLS everywhere; isolation and schema lint block CI; public views allow-listed with explicit columns.
- Service role only in Edge Functions/scripts. `card` needs a valid JWT; `sms-hook` verifies its signature; `backup-heartbeat` checks its secret; strict CORS.
- OTP abuse: Turnstile, Supabase rate limits, per-phone caps, `SMS_DAILY_CAP`. Never log OTPs, API keys or full phones. Rate-limit `slug_available`, `create_tenant`, `request_to_join`, `submit_payment_claim`, public search.
- File uploads: size/mime checks server-side, image re-encoding, virus-safe handling (never execute/serve user files from the app origin; signed URLs), random object names.
- Security headers via `_headers`: CSP (Supabase, Turnstile, map tiles, fonts, Google sign-in), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` allowing camera and WebAuthn for self. Test login, camera, passkeys, maps and push with the CSP on.
- zod on the client **and** SQL checks. No string-built SQL.
- AI: injection defence (17.5), per-tenant quotas, provider data-retention disclosed.
- Privacy: consent records; a tenant is the data controller for its members and the platform is the processor; owner data export; deletion process; bank statements and screenshots contain third-party data (minimise, allow deletion); 18+ only; legal review (G8). `docs/SECURITY.md` documents all of it. `pnpm audit` clean or explained.

---

## 24. Testing and acceptance

**Unit:** phone normalisation (incl. `9.88E+09`), money/paise rounding, due-date maths for both rules (31 Jan → 28 Feb, leap year, IST midnight, anchored cycles, grace), `compute_payout` (joining mid-month, leaving mid-month, absences, half days, advances, all three proration rules, daily wage), status derivation, custom-field validation, Excel date parsing, mapping, import validation, presets, extraction sanity checks, dedupe, category resolution, forecast, P&L definitions.
**Extraction fixtures:** `tests/fixtures/bills/` (printed bill, handwritten, e-bill PDF, each UPI app's screenshot, multi-bill photo, blurry, non-bill, duplicate, injection text) with expected JSON; the `fixture` AI driver runs in CI, and an opt-in `pnpm test:ai-live` calls the real provider and reports accuracy per field.
**RLS/isolation:** section 10.11, including anon access to public views only.
**E2E (Playwright):**
1. Anonymous visitor: home → search → filter → place page → compare → "Request to join" → Google (mock) + phone OTP (console) → request sent.
2. Owner receives the notification, approves with room/plan; the customer is notified, onboards (selfie, generated form), enables the fingerprint lock (virtual authenticator), unlocks the card, sees it lock after 60 s.
3. Listed (imported) number joins and is auto-approved.
4. Customer taps "I paid" with a screenshot; owner confirms; due date moves per due rule; duplicate UTR is flagged; a rejected claim returns a reason.
5. Owner uploads a bill + payment screenshot together → one merged draft → confirm; uploads a duplicate → flagged; quick add; voice (mock transcript).
6. Electricity bill creates a payable; paying it by screenshot links; recurring rule suggested after 3 months (time-travel fixture).
7. Employee joins on the 10th: payout on the 1st equals the expected amount; absences, advance recovery, exit settlement.
8. Weekly Close walkthrough clears Inbox items; cash count difference recorded.
9. Listing: owner submits; admin approves; the place appears in search and `/sitemap.xml`; a report is filed and handled; a `private` place disappears from search but works via QR.
10. Girls' hostel: `area_only` hides the exact address/phone until approval.
11. Hostel: rooms, assign, move, check-out with deposit refund; availability on the public page updates; stale-availability hiding after 14 days.
12. Manager cannot see money unless `can_see_money`; cannot void/import/export/change settings.
13. Admin: suspend a tenant → its members see the unavailable screen and its listing leaves search; admin cannot read member/finance PII without support access.
14. Same person is a customer in two places and staff in a third.
15. Backup heartbeat shows on the dashboard; exports are valid; SMS rate limit blocks the 4th SMS in an hour.

**Acceptance (all true before you stop):**
- [ ] `pnpm build`, `lint`, `typecheck`, unit, RLS/isolation, e2e all pass.
- [ ] Every screen reviewed at 375/768/1280 in light and dark; no overflow.
- [ ] Only shadcn / Animate UI components used; `UI_INVENTORY.md` complete.
- [ ] `.env` and `.env.example` contain every key with step-by-step comments verified against current docs; `pnpm env:check` works; the app fails fast with a clear message.
- [ ] No tenant-specific or brand-specific hard-coding.
- [ ] With `SMS_DRIVER=console` and `AI_DRIVER=fixture` the whole product works; real keys only need env changes.
- [ ] A restore (full and single-tenant) is tested and documented.
- [ ] Lighthouse targets met; link previews verified; sitemap/robots correct.
- [ ] `FINANCE_RULES.md`, `OWNER_GUIDE.md` (very simple words, screenshots, English + Telugu, separate sections for mess, hostel), `ADMIN_GUIDE.md`, `SETUP.md` exist and work from zero.
- [ ] Zero-work audit: a short table in `docs/PLAN.md` listing every recurring human task, who does it, how often, and the measured taps/time. Anything daily is removed.

---

## 25. Phases (commit after each; "done when" must be true)

**Phase 0 — Foundations.** Vite/React/TS/Tailwind/shadcn init, theme, router, i18n, brand config, `.env` + `.env.example` + `env:check`, `CLAUDE.md`, `docs/PLAN.md`, shadcn MCP + Animate UI (**G1**). *Done:* themed shell runs; MCP connected; an Animate UI item installs.

**Phase 1 — Database core.** Tenancy, people, billing, place profile, rooms, join requests, notifications, jobs; public views/RPCs; RLS; seed; isolation tests and schema lint (**G2**). *Done:* isolation suite green.

**Phase 2 — Auth.** Google + mandatory phone OTP, `sms-hook`, `link_my_memberships`, guards, Turnstile, place switcher. *Done:* full login works in dev with the conflict edge case handled.

**Phase 3 — Owner setup and public profile.** `/list-your-place` wizard, presets, plans, fields, modules, rooms/floors/room types, menu editor, public page editor with photos and map pin, listing submission, QR poster, `create-tenant` script. *Done:* a new owner builds a complete listing in under 15 minutes per preset.

**Phase 4 — Marketplace.** Home, explore, place page, compare, saves, city pages, Pages Functions (meta, caching, sitemap), moderation basics in admin, join flow, Inbox requests, in-app + push + email notifications. *Done:* e2e 1, 2, 3, 9, 10 pass; Lighthouse targets met.

**Phase 5 — Members and payments.** Members table, claims ("I paid") and confirmation, mark paid/extend/void, reminders ladder, charges, reports, import/export, "photograph your register" (flagged). *Done:* e2e 4 and import e2e pass.

**Phase 6 — Customer app and card.** `/me`, generated profile form, selfie, passkey, card, staff flags, employee card. *Done:* card e2e passes.

**Phase 7 — Team.** Employees, absences, adjustments, payouts, payslips, exit. *Done:* e2e 7 passes; `compute_payout` property tests pass.

**Phase 8 — Smart Capture and ledger.** Accounts, categories, parties, captures, AI worker with fixture and live drivers, confirm cards, quick add, voice, payables, recurring rules, trust/auto-confirm, share target. *Done:* all 21 cases have passing fixture tests; e2e 5 and 6 pass.

**Phase 9 — Finance intelligence.** Profit meter, Money Map, reports, forecast, insights, price watch, cost per member/plate, assets, documents vault, month close, CA pack, cash count, Weekly Close, **bank statement matching**. *Done:* e2e 8 passes; statement fixtures from pilot data match ≥ 90% of known lines.

**Phase 10 — Platform and pitch.** Admin console completion, `/for-owners` with the leak calculator and book-vs-us animation, `/demo`, legal pages, capacity meter. *Done:* admin e2e passes.

**Phase 11 — Backups and security.** Backup workflow, heartbeat, headers/CSP, restore tests, offboarding/purge, `SECURITY.md`, `RESTORE.md`.

**Phase 12 — Polish.** Motion, Telugu, PWA, accessibility, performance, screenshot review, all guides, zero-work audit.

**Phase 13 — Deploy and pilot.** Cloudflare Pages + prod Supabase + secrets; go-live checklist; pilot with tenant #1 (Sri Vijaya: 10–15 real members first, then everyone) and one hostel (**G7**); handover notes.

**After V1 (do NOT build; keep the data model ready):** payment gateway / auto-collection, SaaS billing of owners, reviews and ratings, custom domains, complaints & maintenance tracking, visitor log, meal on/off, WhatsApp automation, Account Aggregator bank feeds, minors with guardian consent.

---

## 26. Working rules for you

- First action: read this whole file, write `docs/PLAN.md` (including the zero-work audit table), create `CLAUDE.md` (pnpm, tenant isolation first, paise bigint, IST, shadcn-only UI, no secrets in git, drafts-never-silent, where docs live), then start Phase 0.
- Use a task list; commit after each phase; keep `docs/DECISIONS.md` updated (including every deviation and every assumption you could not verify).
- Before using any library or Supabase / MSG91 / Cloudflare / Resend / Anthropic / Web Push API, check its **current documentation**. If this file and the docs disagree, follow the docs and note it.
- Never put a secret in the frontend or in git. Never print OTPs or keys in production logs.
- Every new table, view or function ships with RLS/isolation tests in the same commit. Every new money calculation ships with unit tests.
- When something in this prompt cannot work as written, choose the nearest option that keeps the zero-work rules, record it in `DECISIONS.md`, and continue.
- When finished, give the human a short summary: what works, what he must still do (gates), how to run, test and deploy.