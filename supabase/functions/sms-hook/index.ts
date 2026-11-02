// Supabase Send SMS hook (deploy with --no-verify-jwt). Verifies the Standard Webhooks signature,
// enforces per-phone limits (3/hour, 10/day) and the platform daily cap via SQL, then sends through
// MSG91 or prints to the log in dev (SMS_DRIVER=console). Never logs the OTP when using msg91.
import { Webhook } from "npm:standardwebhooks@1.0.0"
import { createClient } from "npm:@supabase/supabase-js@2"
import { hookError, hookSecret, maskPhone, msg91Request } from "../_shared/sms.ts"

const env = (k: string) => Deno.env.get(k) ?? ""
for (const k of ["SEND_SMS_HOOK_SECRET", "SMS_DRIVER"]) if (!env(k)) console.error(`[sms-hook] missing env ${k}`)

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } })

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })
  const payload = await req.text()
  let event: { user: { phone: string }; sms: { otp: string } }
  try {
    event = new Webhook(hookSecret(env("SEND_SMS_HOOK_SECRET"))).verify(payload, Object.fromEntries(req.headers)) as typeof event
  } catch {
    return hookError("Invalid signature", 401)
  }
  const phone = event.user?.phone?.startsWith("+") ? event.user.phone : `+${event.user?.phone ?? ""}`
  const otp = event.sms?.otp ?? ""
  const driver = env("SMS_DRIVER") || "console"

  const { data: verdict, error } = await admin.rpc("sms_allowed", { p_phone: phone })
  if (error) { console.error("[sms-hook] sms_allowed failed", error.message); return hookError("Could not send the code. Try again.", 500) }
  if (verdict !== "ok") {
    await admin.rpc("sms_record", { p_phone: phone, p_status: verdict, p_provider: driver })
    return hookError(verdict === "blocked_cap" ? "We can't send more codes today. Try again tomorrow." : "Too many codes requested. Wait an hour and try again.", 429)
  }

  if (driver === "console") {
    if (env("SUPABASE_URL").includes(".supabase.co") && !env("ALLOW_CONSOLE_SMS_IN_PROD")) {
      return hookError("SMS is not configured.", 500) // never print OTPs on a hosted project unless explicitly allowed (dev project)
    }
    console.log(`[sms-hook] DEV OTP for ${maskPhone(phone)}: ${otp}`)
    await admin.rpc("sms_record", { p_phone: phone, p_status: "console", p_provider: "console" })
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })
  }

  try {
    const { url, init } = msg91Request({ MSG91_AUTH_KEY: env("MSG91_AUTH_KEY"), MSG91_TEMPLATE_ID: env("MSG91_TEMPLATE_ID") }, phone, otp)
    const r = await fetch(url, init)
    const body = await r.text()
    if (!r.ok || /"type"\s*:\s*"error"/.test(body)) throw new Error(`msg91 ${r.status}`)
    await admin.rpc("sms_record", { p_phone: phone, p_status: "sent", p_provider: "msg91" })
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (e) {
    console.error(`[sms-hook] send failed for ${maskPhone(phone)}: ${(e as Error).message}`)
    await admin.rpc("sms_record", { p_phone: phone, p_status: "failed", p_provider: "msg91", p_error: (e as Error).message })
    return hookError("Could not send the code. Try again in a minute.", 502)
  }
})
