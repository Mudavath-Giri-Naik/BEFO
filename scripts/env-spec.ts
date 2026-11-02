/**
 * Single source of truth for every environment key: group, when it is required, simple steps to get it,
 * and a validator. Used by:
 *   pnpm env:check          (scripts/env-check.ts)
 *   pnpm env:example        (scripts/env-write.ts → .env.example, and .env if it does not exist yet)
 *   pnpm env:push-supabase  (scripts/env-push-supabase.ts → Edge Function secrets)
 * Steps verified against the provider docs on 2026-11-02; see docs/DECISIONS.md for what changed.
 */
export type Need = "dev" | "prod" | "optional" | "feature"
export interface EnvKey {
  key: string
  group: string
  need: Need
  /** For `feature`: which feature needs it. */
  feature?: string
  steps: string[]
  example?: string
  devDefault?: string
  docs?: string
  /** Goes to Supabase Edge Function secrets with env:push-supabase. */
  server?: boolean
  validate?: (v: string) => string | null
}

const url = (v: string) => (/^https?:\/\/[^\s]+[^/]$/.test(v) ? null : "must be a URL without a trailing slash")
const digits = (v: string) => (/^\d{10,15}$/.test(v) ? null : "digits only, with country code (e.g. 919876543210)")
const int = (v: string) => (/^\d+$/.test(v) ? null : "must be a whole number")

export const GROUPS: Record<string, string> = {
  A: "A. FRONTEND (public values, safe in the browser)",
  B: "B. SUPABASE / AUTH (server side — never in the browser)",
  C: "C. AI (bill reading, voice entry)",
  D: "D. NOTIFICATIONS",
  E: "E. CLOUDFLARE PAGES VARIABLES (set in Pages → Settings → Variables and Secrets)",
  F: "F. BACKUPS + CI (GitHub → repo → Settings → Secrets and variables → Actions)",
}

export const ENV: EnvKey[] = [
  // ── A. frontend
  { key: "VITE_APP_NAME", group: "A", need: "dev", devDefault: "BEFO", steps: ["Product name shown everywhere. Decided at Gate G0."] },
  { key: "VITE_APP_URL", group: "A", need: "dev", devDefault: "http://localhost:5173", validate: url,
    steps: ["Public site URL, no trailing slash.", "Dev: http://localhost:5173 · Prod: https://your-domain"] },
  { key: "VITE_DATA_SOURCE", group: "A", need: "dev", devDefault: "demo", validate: (v) => (["demo", "supabase"].includes(v) ? null : "use demo or supabase"),
    steps: ["\"demo\" = public site runs on built-in example places, no backend needed (login disabled).",
            "\"supabase\" = real data. Switch to this once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set."] },
  { key: "VITE_SUPABASE_URL", group: "A", need: "prod", example: "https://abcd1234.supabase.co", validate: url, docs: "https://supabase.com/docs/guides/api/api-keys",
    steps: ["supabase.com/dashboard → open your project", "Click Connect (top bar), or Project Settings → Data API", "Copy the Project URL (looks like https://abcd1234.supabase.co)"] },
  { key: "VITE_SUPABASE_ANON_KEY", group: "A", need: "prod", example: "sb_publishable_...", docs: "https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys",
    steps: ["Project Settings → API Keys → tab \"Publishable and secret API keys\"", "Copy the PUBLISHABLE key (starts with sb_publishable_). Safe for browsers.",
            "(The old \"anon\" key also works, but Supabase is retiring legacy keys by the end of 2026.)"] },
  { key: "VITE_SUPPORT_WHATSAPP", group: "A", need: "prod", validate: digits, example: "919876543210", steps: ["Support WhatsApp number: digits only, with country code."] },
  { key: "VITE_SUPPORT_EMAIL", group: "A", need: "prod", example: "help@your-domain", steps: ["Support email shown on the site."] },
  { key: "VITE_TURNSTILE_SITE_KEY", group: "A", need: "prod", docs: "https://developers.cloudflare.com/turnstile/get-started/",
    steps: ["dash.cloudflare.com → Turnstile → Add widget", "Add your domains (and localhost for testing) → widget mode Managed → Create",
            "Copy the Site key here", "Copy the Secret key into Supabase: Authentication → Attack Protection → Enable CAPTCHA → provider Turnstile → paste → Save"] },
  { key: "VITE_VAPID_PUBLIC_KEY", group: "A", need: "feature", feature: "push notifications",
    steps: ["Run: npx web-push generate-vapid-keys", "Copy \"Public Key\" here", "Copy \"Private Key\" into VAPID_PRIVATE_KEY (group D)"] },
  { key: "VITE_MAP_TILE_URL", group: "A", need: "optional", devDefault: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    steps: ["Map tiles. The OpenStreetMap default is fine for low traffic only (see docs/DECISIONS.md, OSM tile policy)."] },
  { key: "VITE_SENTRY_DSN", group: "A", need: "optional", steps: ["Error tracking: sentry.io → Project → Settings → Client Keys (DSN) → copy"] },

  // ── B. supabase / auth
  { key: "SUPABASE_URL", group: "B", need: "prod", validate: url, steps: ["Same value as VITE_SUPABASE_URL. Used by scripts. (Hosted Edge Functions get it automatically.)"] },
  { key: "SUPABASE_SERVICE_ROLE_KEY", group: "B", need: "prod", example: "sb_secret_...",
    steps: ["Project Settings → API Keys → \"Publishable and secret API keys\" → Secret keys → reveal and copy (starts with sb_secret_)",
            "NEVER put this in the browser, in Cloudflare Pages variables, or in git."] },
  { key: "GOOGLE_OAUTH_CLIENT_ID", group: "B", need: "prod", server: false, docs: "https://supabase.com/docs/guides/auth/social-login/auth-google",
    steps: ["console.cloud.google.com → create or select a project", "Google Auth Platform (or APIs & Services → OAuth consent screen) → Get started → app name, support email → Audience: External → save",
            "Branding → add your domain under Authorized domains; later click \"Publish app\" so anyone can log in",
            "Clients → Create client → Web application", "Authorized redirect URI: https://<PROJECT-REF>.supabase.co/auth/v1/callback (local Supabase: http://127.0.0.1:54321/auth/v1/callback)",
            "Copy Client ID and Client secret here, then paste both in Supabase: Authentication → Sign In / Providers → Google → enable → Save",
            "Supabase: Authentication → URL Configuration → set Site URL and add Redirect URLs (prod + http://localhost:5173/**)"] },
  { key: "GOOGLE_OAUTH_CLIENT_SECRET", group: "B", need: "prod", steps: ["See GOOGLE_OAUTH_CLIENT_ID. Only pasted into the Supabase dashboard; kept here for your records."] },
  { key: "SEND_SMS_HOOK_SECRET", group: "B", need: "prod", server: true, docs: "https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook",
    steps: ["Deploy the function: supabase functions deploy sms-hook --no-verify-jwt", "Supabase → Authentication → Hooks → Send SMS hook → type HTTPS → paste the function URL",
            "Click Generate secret → copy the WHOLE value (looks like v1,whsec_abc...) here — the function strips the prefix itself", "Enable the hook. Also enable the Phone provider (Authentication → Sign In / Providers → Phone)."] },
  { key: "SMS_DRIVER", group: "B", need: "dev", devDefault: "console", server: true, validate: (v) => (["console", "msg91"].includes(v) ? null : "use console or msg91"),
    steps: ["\"console\" prints the OTP in the function logs (dev only). \"msg91\" sends real SMS."] },
  { key: "ALLOW_CONSOLE_SMS_IN_PROD", group: "B", need: "optional", server: true,
    steps: ["Only for your hosted DEV project: set to 1 to let SMS_DRIVER=console print OTPs to function logs there. Never set on prod."] },
  { key: "SMS_DAILY_CAP", group: "B", need: "dev", devDefault: "300", server: true, validate: int, steps: ["Max SMS the whole platform may send per day (cost safety)."] },
  { key: "MSG91_AUTH_KEY", group: "B", need: "feature", feature: "real SMS", server: true, docs: "https://docs.msg91.com/",
    steps: ["msg91.com → sign up and finish KYC", "Register on a DLT portal (Jio / Airtel / Vi / BSNL): entity → sender ID (6 letters, matches your brand) → OTP content template",
            "Template suggestion: \"##OTP## is your login code for BEFO. Do not share it with anyone.\" (DLT approval takes 1–3 days; start early)",
            "MSG91 dashboard → add the approved DLT template → note its Template ID", "MSG91 → API / Authkey section → create or copy the Authkey"] },
  { key: "MSG91_SENDER_ID", group: "B", need: "feature", feature: "real SMS", server: true, steps: ["The 6-letter DLT sender ID (header)."] },
  { key: "MSG91_TEMPLATE_ID", group: "B", need: "feature", feature: "real SMS", server: true, steps: ["MSG91 template ID for the OTP message."] },
  { key: "MSG91_DLT_TEMPLATE_ID", group: "B", need: "feature", feature: "real SMS", server: true, steps: ["DLT template ID from the operator portal (19 digits)."] },
  { key: "WEBAUTHN_RP_ID", group: "B", need: "dev", devDefault: "localhost", server: true,
    steps: ["Your domain only, no https:// and no path (e.g. befo.in). Dev: localhost.", "Changing it later breaks every saved fingerprint card. Decide at Gate G0."] },
  { key: "WEBAUTHN_RP_NAME", group: "B", need: "dev", devDefault: "BEFO", server: true, steps: ["Name shown in the fingerprint prompt (usually the product name)."] },
  { key: "WEBAUTHN_ALLOWED_ORIGINS", group: "B", need: "dev", devDefault: "http://localhost:5173", server: true, steps: ["Comma-separated origins allowed to use passkeys, e.g. https://befo.in,https://www.befo.in"] },
  { key: "CARD_UNLOCK_SECONDS", group: "B", need: "dev", devDefault: "60", server: true, validate: int, steps: ["How long the ID card stays open after a fingerprint."] },
  { key: "PLATFORM_ADMIN_EMAILS", group: "B", need: "prod", server: true, steps: ["Comma-separated emails of platform admins (verified email). Then run: pnpm admin:add"] },
  { key: "PLATFORM_ADMIN_PHONES", group: "B", need: "prod", server: true, steps: ["Comma-separated admin phones, e.g. +919876543210"] },
  { key: "DEFAULT_MAX_MEMBERS", group: "B", need: "dev", devDefault: "100", server: true, validate: int, steps: ["Default member cap for new places."] },

  // ── C. AI
  { key: "ANTHROPIC_API_KEY", group: "C", need: "feature", feature: "Smart Capture (real AI)", server: true, docs: "https://docs.claude.com/en/api/overview",
    steps: ["console.anthropic.com → sign up", "Settings → Billing → add credit and set a monthly spend limit", "API Keys → Create key → copy here"] },
  { key: "AI_DRIVER", group: "C", need: "dev", devDefault: "fixture", server: true, validate: (v) => (["fixture", "anthropic"].includes(v) ? null : "use fixture or anthropic"),
    steps: ["\"fixture\" = canned results for dev/CI (no key needed). \"anthropic\" = real AI."] },
  { key: "AI_MODEL_FAST", group: "C", need: "feature", feature: "Smart Capture (real AI)", server: true, devDefault: "claude-haiku-5-5",
    steps: ["Model for everyday bills. Check the current model names at docs.claude.com → Models overview."] },
  { key: "AI_MODEL_STRONG", group: "C", need: "feature", feature: "Smart Capture (real AI)", server: true, devDefault: "claude-sonnet-5-5",
    steps: ["Model used to retry low-confidence bills."] },
  { key: "AI_DAILY_DOCS_PER_TENANT", group: "C", need: "dev", devDefault: "60", server: true, validate: int, steps: ["Safety limit per place per day."] },
  { key: "AI_MONTHLY_DOCS_PER_TENANT", group: "C", need: "dev", devDefault: "1000", server: true, validate: int, steps: ["Safety limit per place per month."] },
  { key: "AI_MAX_FILE_MB", group: "C", need: "dev", devDefault: "8", server: true, validate: int, steps: ["Largest bill file accepted, in MB."] },

  // ── D. notifications
  { key: "VAPID_PRIVATE_KEY", group: "D", need: "feature", feature: "push notifications", server: true, steps: ["See VITE_VAPID_PUBLIC_KEY (group A)."] },
  { key: "VAPID_SUBJECT", group: "D", need: "feature", feature: "push notifications", server: true, devDefault: "mailto:you@example.com", steps: ["mailto: address push services can contact, e.g. mailto:help@your-domain"] },
  { key: "RESEND_API_KEY", group: "D", need: "feature", feature: "email", server: true, docs: "https://resend.com/docs",
    steps: ["resend.com → sign up", "Domains → Add domain → add the DNS records it shows (SPF, DKIM) at your domain provider → wait for Verified", "API Keys → Create API key (Sending access) → copy here"] },
  { key: "EMAIL_FROM", group: "D", need: "feature", feature: "email", server: true, devDefault: "\"BEFO <hello@example.com>\"", steps: ["Sender, e.g. \"BEFO <hello@your-domain>\" (domain must be verified in Resend)."] },

  // ── E. cloudflare pages
  { key: "SITE_URL", group: "E", need: "prod", validate: url, steps: ["Same as VITE_APP_URL. Set in Cloudflare Pages → your project → Settings → Variables and Secrets."] },
  { key: "SUPABASE_ANON_KEY", group: "E", need: "prod", steps: ["Same as VITE_SUPABASE_ANON_KEY (publishable key). NEVER the secret/service key here."] },

  // ── F. backups + CI
  { key: "SUPABASE_DB_URL", group: "F", need: "prod",
    steps: ["Supabase → Connect → \"Session pooler\" → copy the URI (GitHub runners are IPv4-only, so use the pooler)", "Replace [YOUR-PASSWORD] (reset it in Project Settings → Database if forgotten)"] },
  { key: "R2_ACCOUNT_ID", group: "F", need: "prod", docs: "https://developers.cloudflare.com/r2/api/tokens/",
    steps: ["Cloudflare → R2 Object Storage → Create bucket (e.g. befo-backups)", "Account ID is shown on the R2 overview page"] },
  { key: "R2_ACCESS_KEY_ID", group: "F", need: "prod", steps: ["R2 → Manage API tokens → Create API token → Object Read & Write → limit to the backup bucket → Create", "Copy Access Key ID here"] },
  { key: "R2_SECRET_ACCESS_KEY", group: "F", need: "prod", steps: ["Shown once on the same screen as R2_ACCESS_KEY_ID."] },
  { key: "R2_BUCKET", group: "F", need: "prod", steps: ["The bucket name you created."] },
  { key: "R2_ENDPOINT", group: "F", need: "prod", validate: url, steps: ["https://<ACCOUNT_ID>.r2.cloudflarestorage.com"] },
  { key: "BACKUP_RETENTION_DAYS", group: "F", need: "dev", devDefault: "30", validate: int, steps: ["Delete backups older than this."] },
  { key: "BACKUP_HEARTBEAT_URL", group: "F", need: "prod", validate: url, steps: ["URL of the backup-heartbeat Edge Function: https://<PROJECT-REF>.supabase.co/functions/v1/backup-heartbeat"] },
  { key: "BACKUP_HEARTBEAT_SECRET", group: "F", need: "prod", server: true, steps: ["Any long random string (e.g. openssl rand -hex 32). Same value in GitHub secrets and Supabase secrets."] },
  { key: "SUPABASE_ACCESS_TOKEN", group: "F", need: "optional", steps: ["CI deploys: supabase.com/dashboard/account/tokens → Generate new token"] },
  { key: "SUPABASE_PROJECT_REF", group: "F", need: "optional", steps: ["The code in your project URL (https://<PROJECT-REF>.supabase.co)"] },
  { key: "SUPABASE_DB_PASSWORD", group: "F", need: "optional", steps: ["Project Settings → Database → database password"] },
  { key: "CLOUDFLARE_API_TOKEN", group: "F", need: "optional", steps: ["Cloudflare → My Profile → API Tokens → Create Token → template \"Edit Cloudflare Workers\" or a custom token with Cloudflare Pages: Edit"] },
  { key: "CLOUDFLARE_ACCOUNT_ID", group: "F", need: "optional", steps: ["Cloudflare dashboard → Workers & Pages overview → Account ID (right sidebar)"] },
]
