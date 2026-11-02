# BEFO — build plan and status

Spec: `BUILD_PROMPT_v3.md`. This file tracks what is done, what is next, and the zero-work audit.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 0 Foundations | Vite + React 19 + TS + Tailwind v4 + shadcn/ui, theme (light/dark/system, no flash), router, i18n (en/te), brand config, PWA, `.env` + `.env.example` + `env:check` + `env:push-supabase`, `.mcp.json`, `components.json` | **Done** except Gate G1 (MCP restart) and installing an Animate UI item (registry unreachable from the build machine; see DECISIONS) |
| 1 Database core | Tenancy, people, billing, place profile, rooms/beds, menus, join requests, claims, payments, ledger core, notifications, jobs, passkeys, SMS log; public API; RLS; seed (3 demo + 2 isolation tenants) | **Done.** `pnpm test:rls` = 510 checks green, `pnpm db:lint` green |
| 2 Auth | Google + mandatory phone OTP, guards, `link_my_memberships`, routing by `my_context` | **UI + SQL done.** Pending: `sms-hook` Edge Function, Turnstile widget, place switcher, live test (needs G2) |
| 3 Owner setup | `/list-your-place` wizard, presets, plans, fields, rooms, menu editor, public page editor, QR poster | SQL done (`create_tenant`, presets, `submit_for_listing`). UI next |
| 4 Marketplace | Home, explore (filters, map, compare, saves), place page, join flow | **Public pages done on demo data + Supabase RPCs.** Pending: Pages Functions (edge cache, meta, sitemap), city pages, notifications UI, Lighthouse pass |
| 5 Members & payments | Members table, "I paid" claims, mark paid, void, reminders, charges, import/export | SQL core done (claims, mark_paid, void, member_overview). UI next |
| 6 Customer app & card | `/me`, profile form, selfie, passkey card | Tables ready (passkeys, challenges, unlocks). Not started |
| 7 Team | Employees, absences, payouts | `computePayout` + tests done. Tables/UI not started |
| 8 Smart Capture | captures, AI worker, drafts, payables | Not started (ledger core + dedupe/category helpers done) |
| 9 Finance intelligence | P&L, Money Map, forecast, statements, Weekly Close | P&L definitions + summary table done. Rest not started |
| 10 Platform & pitch | Admin console, `/for-owners`, `/demo`, legal | `/for-owners` (with leak calculator) and draft legal pages done; admin SQL (moderation, status) done |
| 11 Backups & security | Backup workflow, CSP, restore tests | Not started |
| 12 Polish | Motion, Telugu, PWA, a11y, perf | Telugu strings for public site done. Perf budget currently exceeded (see below) |
| 13 Deploy & pilot | Cloudflare + prod Supabase | Blocked on gates G0, G2–G7 |

### Known gaps to fix
- Initial JS on `/` is ~265 KB gzipped (budget 200 KB): the Supabase client loads eagerly. Lazy-load it behind auth (Phase 12).
- Map tiles and Lighthouse could not be checked from the build machine (no outbound access to OSM); verify after deploy.
- `/p/:slug` meta tags are client-side only until the Cloudflare Pages Function lands (Phase 4).

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
