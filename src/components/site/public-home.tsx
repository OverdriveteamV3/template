import Link from "next/link";
import { Languages, Mail, MapPin, Phone, Store, type LucideIcon } from "lucide-react";
import { ContactForm } from "@/components/site/contact-form";
import { ContactMap } from "@/components/site/contact-map";
import { BookingPanel } from "@/components/booking/booking-panel";
import { BookingSheet } from "@/components/booking/booking-sheet";
import { SiteFooter } from "@/components/site/site-footer";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { ProfileMenu } from "@/components/site/profile-menu";
import { SectionTitle } from "@/components/site/section-title";
import { translator } from "@/lib/i18n/server";
import { ServiceChart } from "@/components/site/service-chart";
import type { PublicSite } from "@/lib/site/types";
import type { Viewer } from "@/server/site";
import { themeStyle } from "@/lib/theme/tokens";

const navLink = "relative py-1 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100";

function factIcon(label: string) {
  return label.toLowerCase().includes("language") ? Languages : Store;
}

function ContactRow({ icon: Icon, text, label, href }: { icon: LucideIcon; text: string; label?: string; href?: string }) {
  const body = label ? <span className="leading-snug"><span className="text-muted">{label}. </span>{text}</span> : <span className="leading-snug">{text}</span>;
  return (
    <li className="flex items-center gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#e6e5df] bg-white text-[#111]">
        <Icon size={14} strokeWidth={2} aria-hidden />
      </span>
      {href ? <a href={href} className="leading-snug">{text}</a> : body}
    </li>
  );
}

export async function PublicHome({ site, viewer, today }: { site: PublicSite; viewer: Viewer | null; today: string }) {
  const t = await translator();
  const approved = site.testimonials;
  return (
    <div style={themeStyle(site.theme)} className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-3">
          <Link href="/" className="flex h-8 items-center gap-2 font-semibold tracking-tight">
            {site.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.logoUrl} alt={site.name} className="h-8 max-w-[11rem] object-contain object-left" />
            ) : (
              <>
                <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-[11px] text-background">{site.name.slice(0, 1)}</span>
                {site.name}
              </>
            )}
          </Link>
          <nav className="mr-12 flex items-center gap-4 text-sm">
            <LanguageToggle />
            <a className={navLink} href="#services">{t("nav.services")}</a>
            <a className={navLink} href="#about">{t("nav.about")}</a>
            <a className={navLink} href="#contact">{t("nav.contact")}</a>
            {viewer ? <ProfileMenu email={viewer.email} dashboard={Boolean(viewer.role)} /> : <Link className={navLink} href={`/sign-in?next=${encodeURIComponent("/")}`}>{t("nav.signIn")}</Link>}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-5 py-6">
        <div className="relative overflow-hidden rounded-[16px]">
          {site.hero.landingImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.hero.landingImageUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" />
          ) : null}
          <div className="relative grid items-start gap-6 p-4 lg:grid-cols-[minmax(0,0.28fr)_minmax(0,0.44fr)_minmax(0,0.28fr)] lg:p-5">
        <aside className="space-y-4">
          <div className="panel relative min-h-[420px] overflow-hidden bg-surface">
            {site.hero.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.hero.imageUrl} alt={site.hero.alt || ""} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${site.hero.focalX}% ${site.hero.focalY}%` }} />
            ) : (
              <div className="grid min-h-[420px] place-items-center text-4xl font-semibold">{site.name.slice(0, 1)}</div>
            )}
          </div>
          <ul className="space-y-1 text-sm">
            {site.contact.address ? <ContactRow icon={MapPin} text={site.contact.address} /> : null}
            {site.contact.phone ? <ContactRow icon={Phone} text={site.contact.phone} href={`tel:${site.contact.phone}`} /> : null}
            {site.contact.email ? <ContactRow icon={Mail} text={site.contact.email} href={`mailto:${site.contact.email}`} /> : null}
            {site.facts.map((fact) => <ContactRow key={fact.label} icon={factIcon(fact.label)} label={fact.label} text={fact.value} />)}
          </ul>
        </aside>
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-[#9b9b94]">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            {site.category.toUpperCase()}
          </p>
          <h1 className="mt-3 text-[2.75rem] font-semibold leading-[0.95] tracking-tight">{site.name}</h1>
          {site.about.visible && site.about.short ? <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">{site.about.short}</p> : site.tagline ? <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">{site.tagline}</p> : null}
          {site.about.companyBio ? <p className="mt-4 max-w-md text-sm leading-relaxed">{site.about.companyBio}</p> : null}
          <div id="book-mobile" className="mt-4 lg:hidden"><BookingSheet site={site} today={today} label={site.hero.cta || "Book an Appointment"} /></div>
        </div>
        <div id="book" className="hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-auto">
          <BookingPanel site={site} today={today} frost />
        </div>
          </div>
        </div>
        <article className="mt-8 flex flex-col gap-6">
          {site.sections.includes("about") && site.about.visible && site.about.short ? (
            <section id="about" className="panel scroll-mt-6 p-6 md:p-8">
              <SectionTitle>{t("home.about")}</SectionTitle>
              <p className="mt-5 max-w-3xl text-2xl font-semibold leading-snug tracking-tight">{site.about.short}</p>
              {site.about.body ? <p className="mt-6 rounded-[14px] border border-[#e6e5df] bg-white p-5 text-sm leading-relaxed">{site.about.body}</p> : null}
            </section>
          ) : null}
          {site.sections.includes("services") && site.services.length > 0 ? (
            <section id="services" className="panel scroll-mt-6 p-6 md:p-8">
              <ServiceChart services={site.services} />
            </section>
          ) : null}
          <section id="contact" className="panel scroll-mt-6 p-6 md:p-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-stretch">
              <div className="flex h-full flex-col">
                <SectionTitle>{t("home.contact")}</SectionTitle>
                {site.contact.address ? (
                  <div className="mt-4 min-h-[320px] flex-1 overflow-hidden rounded-[14px] border border-border bg-surface">
                    <ContactMap address={site.contact.address} name={site.name} theme={site.theme} />
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col lg:h-full lg:pt-[calc(2.25rem+1rem)]">
                <div className="flex flex-col rounded-[14px] border border-[#e6e5df] bg-white p-5 lg:min-h-[320px] lg:flex-1">
                  <ContactForm databaseReady={site.databaseReady} />
                </div>
              </div>
            </div>
          </section>
          {site.sections.includes("testimonials") ? (
            <section className="panel p-6 md:p-8">
              <SectionTitle>{t("home.testimonials")}</SectionTitle>
              {approved.length > 0 ? (
                <ul className="mt-5 grid gap-3 md:grid-cols-2">
                  {approved.map((item) => (
                    <li key={item.name} className="rounded-[12px] border border-[#e6e5df] bg-white p-5">
                      <p className="text-2xl leading-none text-primary" aria-hidden>“</p>
                      <p className="mt-3 text-sm leading-relaxed">{item.quote}</p>
                      <p className="mt-4 text-[10px] font-semibold tracking-[0.16em] text-[#9b9b94]">{item.name.toUpperCase()}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t("home.testimonialsEmpty")}</p>
              )}
            </section>
          ) : null}
        </article>
      </main>
      <SiteFooter site={site} year={today.slice(0, 4) || "2026"} />
    </div>
  );
}
