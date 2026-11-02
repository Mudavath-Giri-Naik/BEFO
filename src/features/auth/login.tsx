import { Smartphone } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { LogoMark } from "@/components/befo/logo"
import { brand } from "@/app/brand"
import { normalizePhone } from "@/lib/phone"
import { usePageMeta } from "@/lib/meta"
import { supabase } from "@/lib/supabase"
import { homeFor, useAuth } from "./session"

function safeNext(n: string | null) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : null
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.2z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2a11 11 0 0 0 0 9.8L5.7 14z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10c.9-2.6 3.4-4.6 6.3-4.6z" />
    </svg>
  )
}

export default function LoginPage({ mode = "login" }: { mode?: "login" | "verify" }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const next = safeNext(sp.get("next"))
  const { user, phoneVerified, context } = useAuth()
  const [usePhone, setUsePhone] = useState(mode === "verify")
  usePageMeta({ title: mode === "verify" ? t("auth.verifyTitle") : t("auth.title") })

  useEffect(() => {
    if (user && phoneVerified) nav(next ?? homeFor(context), { replace: true })
    else if (user && !phoneVerified && mode === "login") nav(`/login/verify-phone${next ? `?next=${encodeURIComponent(next)}` : ""}`, { replace: true })
  }, [user, phoneVerified, context, next, nav, mode])

  const google = async () => {
    if (!supabase) return
    const redirectTo = `${location.origin}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })
    if (error) toast.error(error.message)
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center px-4 py-10">
      <LogoMark className="size-12" />
      <h1 className="mt-5 text-3xl font-extrabold">{mode === "verify" ? t("auth.verifyTitle") : t("auth.title")}</h1>
      <p className="mt-2 text-muted-foreground">{mode === "verify" ? t("auth.verifyHint") : `Use ${brand.name} to request a seat, see your ID card and pay your dues.`}</p>
      {!supabase && <Alert className="mt-6"><AlertDescription>{t("auth.needsBackend")}</AlertDescription></Alert>}
      {mode === "login" && !usePhone && (
        <div className="mt-8 space-y-3">
          <Button size="lg" variant="outline" className="h-12 w-full gap-3 text-base" onClick={google} disabled={!supabase}><GoogleIcon />{t("auth.google")}</Button>
          <div className="flex items-center gap-3 py-2"><Separator className="flex-1" /><span className="text-sm text-muted-foreground">or</span><Separator className="flex-1" /></div>
          <Button size="lg" variant="ghost" className="h-12 w-full gap-3 text-base" onClick={() => setUsePhone(true)} disabled={!supabase}><Smartphone className="size-5" />{t("auth.phone")}</Button>
        </div>
      )}
      {(usePhone || mode === "verify") && <PhoneOtp mode={user ? "add" : "signin"} />}
      <p className="mt-8 text-xs text-muted-foreground">By continuing you agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy policy</Link>. You must be 18 or older.</p>
    </div>
  )
}

/** Phone OTP. "signin" = log in with phone; "add" = verify a phone on a Google account (phone_change). */
function PhoneOtp({ mode }: { mode: "signin" | "add" }) {
  const { t } = useTranslation()
  const [phone, setPhone] = useState("")
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [wait, setWait] = useState(0)
  const [busy, setBusy] = useState(false)
  const [tries, setTries] = useState(0)
  useEffect(() => {
    if (wait <= 0) return
    const id = setTimeout(() => setWait(wait - 1), 1000)
    return () => clearTimeout(id)
  }, [wait])

  const send = async () => {
    const e164 = normalizePhone(phone)
    if (!e164) return toast.error("Enter a 10-digit mobile number.")
    if (!supabase) return
    setBusy(true)
    const { error } = mode === "add" ? await supabase.auth.updateUser({ phone: e164 }) : await supabase.auth.signInWithOtp({ phone: e164 })
    setBusy(false)
    if (error) {
      if (/already|exists|registered/i.test(error.message)) return toast.error(t("auth.phoneTaken"))
      return toast.error(error.message)
    }
    setSentTo(e164); setWait(30); setTries(0); setCode("")
  }
  const verify = async (token: string) => {
    if (!supabase || !sentTo) return
    setBusy(true)
    const { error } = await supabase.auth.verifyOtp({ phone: sentTo, token, type: mode === "add" ? "phone_change" : "sms" })
    setBusy(false)
    if (error) {
      const n = tries + 1
      setTries(n); setCode("")
      if (n >= 3) { setSentTo(null); return toast.error("Too many wrong codes. Request a new one.") }
      return toast.error("That code is not right. Check the SMS and try again.")
    }
    toast.success("Mobile number verified")
  }

  if (!sentTo) {
    return (
      <form className="mt-8 space-y-3" onSubmit={(e) => { e.preventDefault(); void send() }}>
        <Label htmlFor="phone">{t("auth.phoneLabel")}</Label>
        <div className="flex gap-2">
          <span className="flex h-12 items-center rounded-md border bg-muted px-3 font-semibold">+91</span>
          <Input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" className="h-12 text-lg" />
        </div>
        {/* Cloudflare Turnstile widget mounts here when VITE_TURNSTILE_SITE_KEY is set (Phase 2, Gate G4). */}
        <Button type="submit" size="lg" className="h-12 w-full" disabled={busy || !supabase}>{t("auth.sendCode")}</Button>
      </form>
    )
  }
  return (
    <div className="mt-8 space-y-4">
      <Label>{t("auth.codeLabel")} · {sentTo}</Label>
      <InputOTP maxLength={6} value={code} onChange={(v) => { setCode(v); if (v.length === 6) void verify(v) }} autoComplete="one-time-code" inputMode="numeric" disabled={busy}>
        <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="size-12 text-lg" />)}</InputOTPGroup>
      </InputOTP>
      <div className="flex items-center justify-between">
        <Button variant="link" className="px-0" onClick={() => setSentTo(null)}>Change number</Button>
        <Button variant="ghost" className="h-11" disabled={wait > 0 || busy} onClick={send}>{wait > 0 ? t("auth.resendIn", { s: wait }) : t("auth.resend")}</Button>
      </div>
    </div>
  )
}
