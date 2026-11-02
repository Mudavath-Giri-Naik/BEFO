import { Hammer } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { brand } from "@/app/brand"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { usePageMeta } from "@/lib/meta"

export function NotFoundPage() {
  const { t } = useTranslation()
  usePageMeta({ title: t("notFound.title") })
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-7xl font-extrabold text-primary/30">404</p>
      <h1 className="mt-2 text-2xl font-bold">{t("notFound.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("notFound.body")}</p>
      <Button asChild className="mt-6 h-11"><Link to="/">{t("notFound.home")}</Link></Button>
    </div>
  )
}

export function BuildingPage({ title, phase }: { title: string; phase: string }) {
  const { t } = useTranslation()
  usePageMeta({ title })
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <Hammer className="size-10 text-primary" aria-hidden />
      <h1 className="mt-4 text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{t("building.body")}</p>
      <p className="mt-1 text-sm text-muted-foreground">Planned in {phase} (see docs/PLAN.md).</p>
      <Button asChild variant="outline" className="mt-6 h-11"><Link to="/explore">{t("nav.explore")}</Link></Button>
    </div>
  )
}

const LEGAL: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terms of use",
    body: [
      `${brand.name} lists hostels, PGs, messes and tiffin services. Each place's information is entered and controlled by its owner.`,
      "You must be 18 or older to request to join a place or to list one.",
      "Payments are made directly between you and the owner. We do not collect or hold money.",
      "Owners must not post fake listings, misleading prices or photos that show residents' faces. We may hide or remove any listing.",
    ],
  },
  privacy: {
    title: "Privacy policy",
    body: [
      "We ask for your mobile number to stop fake accounts. It is shared only with places you ask to join.",
      "For places you join, the owner is responsible for your member data; we store it for them.",
      "Bills and payment screenshots that owners upload may be read by an AI service (Anthropic) to fill in amounts and dates. They are not used to train AI models.",
      "We do not collect government ID numbers or health data.",
      "You can ask for your data to be exported or deleted.",
    ],
  },
  about: { title: `About ${brand.name}`, body: ["We help students and working people find a place to stay and eat, with seats, menus and prices that come straight from the owner's records."] },
  help: {
    title: "Help",
    body: [
      "To report a listing, open the place and tap “Report this listing” at the bottom of the page.",
      brand.supportEmail ? `Email us at ${brand.supportEmail}.` : "Support contact details will appear here.",
    ],
  },
}

export function LegalPage({ page }: { page: keyof typeof LEGAL }) {
  const doc = LEGAL[page]
  usePageMeta({ title: doc.title })
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 id={page === "help" ? undefined : "top"} className="text-3xl font-bold">{doc.title}</h1>
      {(page === "terms" || page === "privacy") && (
        <Alert className="mt-6"><AlertTitle>Draft</AlertTitle><AlertDescription>This text is waiting for a lawyer's review before launch (Gate G8).</AlertDescription></Alert>
      )}
      <div className="mt-6 space-y-4 text-lg leading-relaxed" id={page === "help" ? "report" : undefined}>
        {doc.body.map((p) => <p key={p}>{p}</p>)}
      </div>
    </div>
  )
}
