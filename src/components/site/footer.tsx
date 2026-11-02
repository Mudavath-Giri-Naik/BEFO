import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { brand } from "@/app/brand"
import { LogoMark } from "@/components/befo/logo"
import { CtaPill } from "./cta"
import { photo } from "./media"
import { Eyebrow, Reveal, Words } from "./reveal"
import { getLenis } from "./smooth-scroll"

/** Dark footer: closing call-to-action, link columns, contact, and the big wordmark card. */
export function SiteFooter() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  const cols: { title: string; links: [string, string][] }[] = [
    { title: "Menu", links: [["/explore", t("nav.explore")], ["/hostels", "Hostels & PGs"], ["/messes", t("nav.mess")], ["/compare", t("common.compare")]] },
    { title: "Owners", links: [["/for-owners", t("nav.forOwners")], ["/list-your-place", "List your place"], ["/demo", "Owner demo"]] },
    { title: "Help", links: [["/help", t("footer.help")], ["/terms", t("footer.terms")], ["/privacy", t("footer.privacy")], ["/help#report", t("footer.report")]] },
  ]
  const top = () => { const l = getLenis(); if (l) l.scrollTo(0, { duration: 1.6 }); else window.scrollTo({ top: 0, behavior: "smooth" }) }
  return (
    <footer className="mt-auto bg-footer text-footer-foreground" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto max-w-[1200px] px-5 pt-24 sm:px-8">
        <Reveal><Eyebrow light>Your stay</Eyebrow></Reveal>
        <Words text="Always here for students and the people who host them" className="mt-4 max-w-[760px] text-[38px] leading-[1.08] sm:text-[56px]" />
        <Reveal delay={0.15} className="mt-8"><CtaPill to="/explore" light>Find a place</CtaPill></Reveal>

        <div className="mt-20 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-4">
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h3 className="text-[16px] text-footer-foreground/55">{c.title}</h3>
              <ul className="mt-4 space-y-1">
                {c.links.map(([to, label]) => (
                  <li key={to}><Link to={to} className="inline-flex min-h-10 items-center text-[20px] transition-opacity hover:opacity-70">{label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <h3 className="text-[16px] text-footer-foreground/55">Contact</h3>
            <ul className="mt-4 space-y-1 text-[20px]">
              {brand.supportEmail ? <li><a href={`mailto:${brand.supportEmail}`} className="hover:opacity-70">{brand.supportEmail}</a></li> : <li className="text-footer-foreground/55">Coming soon</li>}
              {brand.supportWhatsApp && <li><a href={`https://wa.me/${brand.supportWhatsApp}`} className="hover:opacity-70">WhatsApp</a></li>}
            </ul>
          </div>
        </div>

        <div className="mt-20 flex items-center justify-between text-[16px] text-footer-foreground/55">
          <p>© {brand.name}, {year}</p>
          <button type="button" onClick={top} className="min-h-11 transition-colors hover:text-footer-foreground">Back to top</button>
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] px-3 pt-4 pb-1">
        <Link to="/" aria-label={`${brand.name} home`} className="relative block overflow-hidden rounded-[32px]">
          <img src={photo("livingRoom", 1600, 520)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
          <span className="absolute inset-0 bg-black/45" />
          <span className="relative flex items-center justify-center gap-[3vw] py-6 text-white sm:py-10">
            <LogoMark className="size-[16vw] max-h-[150px] max-w-[150px] [&_.stroke-brand]:stroke-white" />
            <span className="text-[22vw] leading-[0.9] font-medium tracking-[-0.05em] sm:text-[min(20vw,220px)]">{brand.name}</span>
          </span>
        </Link>
      </div>
    </footer>
  )
}
