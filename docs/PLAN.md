# BEFO — build plan and status

Spec: `BUILD_PROMPT_v3.md`. This file tracks what is done, what is next, and the zero-work audit.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 0 Foundations | Vite + React 19 + TS + Tailwind v4 + shadcn/ui, theme (light/dark/system, no flash), router, i18n (en/te), brand config, PWA, `.env` + `.env.example` + `env:check` + `env:push-supabase`, `.mcp.json`, `components.json` | **Done** except Gate G1 (MCP restart) and installing an Animate UI item (registry unreachable from the build machine; see DECISIONS) |
| 1 Database core | Tenancy, people, billing, place profile, rooms/beds, menus, join requests, claims, payments, ledger core, notifications, jobs, passkeys, SMS log; public API; RLS; seed (3 demo + 2 isolation tenants) | **Done.** `pnpm test:rls` = 517 checks green, `pnpm db:lint` green |
| 2 Auth | Google + mandatory phone OTP, guards, `link_my_memberships`, routing by `my_context` | **Live on hosted Supabase:** Google sign-in, phone OTP via `sms-hook` (console driver + a fixed test number until MSG91), place switcher. Pending: MSG91 (G3), Turnstile widget |
| 3 Owner setup | `/list-your-place` wizard, presets, plans, fields, rooms, menu editor, public page editor, QR poster | **Wizard done** (3 steps → `create_tenant`). Next: rooms/floors editor, menu editor, public page editor with photos + pin, QR poster, `create-tenant` script |
| 4 Marketplace | Home, explore (filters, map, compare, saves), place page, join flow | **Public pages + join flow done.** Pages Functions written (edge-cached `/api/explore`, `/api/place/:slug`, `/p/:slug` meta/OG/JSON-LD, `/sitemap.xml`) — untested until G4. Pending: notifications UI + push/email, Lighthouse pass |
| 5 Members & payments | Members table, "I paid" claims, mark paid, void, reminders, charges, import/export | **Owner Today / Inbox / Members (mark paid, WhatsApp reminder, add member, confirm/ask/reject claims, approve/waitlist/reject requests) done**, also as read-only `/demo`. Next: customer "I paid" screen, void/extend/pause UI, charges, Excel import/export |
| 6 Customer app & card | `/me`, profile form, selfie, passkey card | Tables ready (passkeys, challenges, unlocks). Not started |
| 7 Team | Employees, absences, payouts | `computePayout` + tests done. Tables/UI not started |
| 8 Smart Capture | captures, AI worker, drafts, payables | Not started (ledger core + dedupe/category helpers done) |
| 9 Finance intelligence | P&L, Money Map, forecast, statements, Weekly Close | P&L definitions + summary table done. Rest not started |
| 10 Platform & pitch | Admin console, `/for-owners`, `/demo`, legal | **Admin console live** (`/admin`: overview, applications → approve/reject, places → publish/verify/suspend, reports). New businesses need admin approval (0011). `/for-owners`, `/demo`, draft legal pages done. Pending: book-vs-us animation |
| 11 Backups & security | Backup workflow, CSP, restore tests | `_headers` with CSP/HSTS/Permissions-Policy done. Backup workflow + restore tests not started |
| 12 Polish | Motion, Telugu, PWA, a11y, perf | Telugu strings for public site done. Perf budget currently exceeded (see below) |
| 13 Deploy & pilot | Vercel + hosted Supabase | **Supabase live** (G2 done, see below). Vercel import pending (G4). Then G3, G5–G7 |

### Known gaps to fix
- Initial JS on `/` is ~265 KB gzipped (budget 200 KB): the Supabase client loads eagerly. Lazy-load it behind auth (Phase 12).
- Map tiles and Lighthouse could not be checked from the build machine (no outbound access to OSM); verify after deploy.
- `/p/:slug` meta tags are client-side only until the Cloudflare Pages Function lands (Phase 4).

## Live now (2026-11-03)

- **Supabase** `jplbjlfxrklvznmmrskh` (Postgres 17, eu-central-1): migrations 0001–0010 applied with `pnpm db:migrate`
  (no seed). Advisors: no ERRORs; remaining WARNs are by design (definer RPC API) or performance notes for later
  (see DECISIONS). Google provider on; redirect URI verified. Phone provider + Send SMS hook → `sms-hook`
  (console driver, `ALLOW_CONSOLE_SMS_IN_PROD=1`) and one test number with a fixed code.
- **Verified end to end on the real project** (owner's own account): Google sign-in → phone verify → wizard
  ("BEFO Test Hostel", draft, slug `befo-test-hostel`) → add member → mark paid ₹6,000 cash → Today / Inbox /
  Residents correct; payment, confirmed ledger transaction and audit rows written. Rename or archive the test
  place before going public.
- **App** runs on `VITE_DATA_SOURCE=supabase` locally. e2e stays on demo data by design.

## Left to do

| What | Why it matters | Who |
|---|---|---|
| Vercel import + env vars (G4), then Site URL / Redirect URLs for the Vercel domain | Public site | Owner clicks, Claude verifies |
| **MSG91 + DLT** (G3): set `SMS_DRIVER=msg91`, MSG91 secrets, **remove `ALLOW_CONSOLE_SMS_IN_PROD`** and the test number | Real SMS for real users; console mode prints codes to logs | Owner (DLT 1–3 days) |
| **Turnstile** on login/OTP and join requests | Bot and SMS-pumping protection before launch | Owner key + Claude |
| **Backups** (Phase 11): nightly dump to R2 + restore test | Data safety; Supabase free tier has no PITR | Owner (Cloudflare R2) + Claude |
| **AI keys** (G6): `ANTHROPIC_API_KEY` with spend limit, `AI_DRIVER` | Smart Capture (Phase 8) | Owner |
| Email (Resend) and push (VAPID) keys | Notifications | Owner |
| Rotate `SUPABASE_ACCESS_TOKEN` when setup is done; a separate dev project later | Least privilege | Owner |
| Performance advisors: index FKs, merge overlapping read/write policies once there is traffic | Speed at scale | Claude |
| Customer app (Phase 6): `/me` now lists places, applications and due dates; still to come: "I paid", join-request status, card | Members' own screen | Claude |
| Disable the unused e-mail/password provider (Authentication → Providers → Email) | App uses Google + phone only; admin rights follow a confirmed e-mail | Owner |

## Zero-work audit (recurring human tasks)

Target: owner ≈ 10 min/week, customer ≈ once a month, employee nothing. "Measured" values will be filled from the pilot.

| Task | Who | How often | Design | Taps / time (target) |
|---|---|---|---|---|
| Weekly Close (claims, drafts, cash count, availability ✔) | Owner | Weekly (Fri 18:00 nudge) | Guided stepper, skippable steps | ≤ 10 min |
| Confirm a payment claim | Owner/manager | Per claim (batched in Inbox) | One tap; bulk "confirm all green" | 1 tap |
| Decide a join request | Owner/manager | Per request | Approve with room + plan on one screen | 2 taps |
| Record cash received | Owner/manager | When cash is handed over | Pick person → amount defaults to plan → tap | 3 taps |
| Add an expense | Owner | When a bill arrives | Photo/share → background draft → confirm | 2 taps + photo |
| Mark absences | Owner | Only when someone is absent; month-end "all present ✔" | Exception-based | 1 tap/month if no absences |
| Pay salaries | Owner | Monthly (payout day) | Draft payouts → pay outside app → Mark paid | 1 tap per person |
| Confirm availability is correct | Owner | Weekly | One-tap notification | 1 tap |
| Tap "I paid" | Customer | Monthly (optional) | Amount pre-filled, UTR optional | 3 taps |
| Register + profile | Customer | Once | Google + OTP, selfie, generated form | ~3 min once |
| Anything | Employee | Never | Owner manages them; printable card | 0 |

Nothing in the product requires a daily action.
