import { CheckCircle2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useParams, useSearchParams } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/session"
import { formatRupees } from "@/lib/money"
import { usePageMeta } from "@/lib/meta"
import { supabase } from "@/lib/supabase"

interface JoinInfo {
  slug: string; name: string; business_type: string; area: string; city: string
  room_types: { id: string; name: string; monthly_price_paise: number }[]
  plans: { id: string; name: string; price_paise: number }[]
}

const ERRORS: Record<string, string> = {
  request_open: "You already have a request open for this place. Check Requests.",
  not_on_list: "This place only accepts people already on its list. Contact the owner.",
  rate_limited: "You have sent many requests today. Try again tomorrow.",
  place_unavailable: "This place is not taking requests right now.",
}

export default function JoinPage() {
  const { slug = "" } = useParams()
  const [sp] = useSearchParams()
  const { t } = useTranslation()
  const { user } = useAuth()
  const info = useQuery({ queryKey: ["join-info", slug], queryFn: async () => (await supabase!.rpc("public_join_info", { p_slug: slug })).data as JoinInfo | null })
  const [name, setName] = useState<string>((user?.user_metadata?.full_name as string) ?? "")
  const [room, setRoom] = useState(sp.get("room") ?? "")
  const [plan, setPlan] = useState("")
  const [moveIn, setMoveIn] = useState("")
  const [message, setMessage] = useState("")
  const [adult, setAdult] = useState(false)
  const [consent, setConsent] = useState(false)
  const [done, setDone] = useState<null | "pending" | "auto_approved" | "already_member">(null)
  const [busy, setBusy] = useState(false)
  usePageMeta({ title: info.data ? `${t("common.requestToJoin")} · ${info.data.name}` : t("common.requestToJoin") })

  if (info.isLoading) return <div className="mx-auto max-w-lg p-6"><Skeleton className="h-96" /></div>
  if (!info.data) return <div className="mx-auto max-w-lg p-10 text-center"><h1 className="text-2xl font-bold">{t("place.notFound")}</h1></div>
  const p = info.data

  if (done) return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <CheckCircle2 className="mx-auto size-14 text-leaf" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold">{done === "pending" ? "Request sent" : "You are in"}</h1>
      <p className="mt-2 text-muted-foreground">{done === "pending" ? `${p.name} will reply soon. You will get a notification.` : `Your number is already on ${p.name}'s list. Finish your profile to get your ID card.`}</p>
      <Button asChild className="mt-6 h-11"><Link to={done === "pending" ? "/me/requests" : "/me"}>{done === "pending" ? t("nav.requests") : t("nav.home")}</Link></Button>
    </div>
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const { data, error } = await supabase!.rpc("request_to_join", {
      p_slug: slug, p_name: name, p_adult: adult, p_consent: consent, p_message: message || null,
      p_room_type_id: room || null, p_plan_id: plan || null, p_move_in: moveIn || null,
    })
    setBusy(false)
    if (error) return toast.error(ERRORS[error.message] ?? t("common.somethingWrong"))
    setDone((data as { status: typeof done }).status)
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-5 px-4 py-10">
      <div>
        <p className="text-sm text-muted-foreground">{p.area}, {p.city}</p>
        <h1 className="text-3xl font-bold">{t("common.requestToJoin")}: {p.name}</h1>
      </div>
      <div className="space-y-2"><Label htmlFor="name">Your name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="h-12" /></div>
      {p.room_types.length > 0 && (
        <div className="space-y-2"><Label>Room type</Label>
          <Select value={room} onValueChange={setRoom}><SelectTrigger className="h-12 w-full"><SelectValue placeholder="Choose a room type" /></SelectTrigger>
            <SelectContent>{p.room_types.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} · {formatRupees(r.monthly_price_paise)}</SelectItem>)}</SelectContent></Select></div>
      )}
      {p.plans.length > 0 && (
        <div className="space-y-2"><Label>Plan</Label>
          <Select value={plan} onValueChange={setPlan}><SelectTrigger className="h-12 w-full"><SelectValue placeholder="Choose a plan" /></SelectTrigger>
            <SelectContent>{p.plans.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} · {formatRupees(r.price_paise)}</SelectItem>)}</SelectContent></Select></div>
      )}
      <div className="space-y-2"><Label htmlFor="movein">Move-in or start date</Label><Input id="movein" type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} className="h-12" /></div>
      <div className="space-y-2"><Label htmlFor="msg">Message to the owner (optional)</Label><Textarea id="msg" maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
      <Label className="flex min-h-11 cursor-pointer items-start gap-3 font-normal"><Checkbox checked={adult} onCheckedChange={(c) => setAdult(!!c)} className="mt-0.5" />I am 18 years or older.</Label>
      <Label className="flex min-h-11 cursor-pointer items-start gap-3 font-normal"><Checkbox checked={consent} onCheckedChange={(c) => setConsent(!!c)} className="mt-0.5" />Share my name and verified mobile number with {p.name}.</Label>
      <Button type="submit" size="lg" className="h-12 w-full" disabled={busy || !adult || !consent || !name.trim()}>Send request</Button>
    </form>
  )
}
