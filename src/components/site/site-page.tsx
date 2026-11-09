"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { ContactForm } from "@/components/site/contact-form";
import { ContactMap } from "@/components/site/contact-map";
import { BookingPanel } from "@/components/booking/booking-panel";
import { BookingSheet } from "@/components/booking/booking-sheet";
import { SiteFooter } from "@/components/site/site-footer";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { ProfileMenu } from "@/components/site/profile-menu";
import { SectionTitle } from "@/components/site/section-title";
import { PageForm } from "@/components/site/page-form";
import { ReviewRow } from "@/components/site/review-row";
import { ServiceChart } from "@/components/site/service-chart";
import { useT } from "@/components/i18n/locale-provider";
import { menuEntries, type PublicSite } from "@/lib/site/types";
import { MaintenancePage } from "@/components/site/maintenance-page";
import { googleFontHref, themeStyle } from "@/lib/theme/tokens";

const navLink = "relative py-1 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100";

export function SitePage({ site, viewer, today, preview = false }: { site: PublicSite; viewer: { email: string; role: string | null } | null; today: string; preview?: boolean }) {
  const t = useT();
  const approved = site.testimonials;
  const reviewSources = [
    site.reviewLinks.google ? { label: t("dash.googleReviews"), href: site.reviewLinks.google } : null,
    site.reviewLinks.yelp ? { label: t("dash.yelpReviews"), href: site.reviewLinks.yelp } : null,
    site.reviewLinks.facebook ? { label: t("dash.facebookReviews"), href: site.reviewLinks.facebook } : null,
    site.reviewLinks.other ? { label: t("dash.otherReviews"), href: site.reviewLinks.other } : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item));
  const menu = menuEntries(site.navigation, { services: site.navLabels.services || t("nav.services"), about: site.navLabels.about || t("nav.about"), contact: site.navLabels.contact || t("nav.contact"), appointments: site.navLabels.appointments || t("nav.appointments") });
  function jump(event: MouseEvent<HTMLAnchorElement>) {
    if (!preview) return;
    const id = event.currentTarget.getAttribute("href")?.replace("#", "");
    const node = id ? document.getElementById(id) : null;
    if (!node) return;
    event.preventDefault();
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (site.maintenance) return <MaintenancePage name={site.name} category={site.category} logoUrl={site.logoUrl} />;
  return (
    <div style={themeStyle(site.theme)} className="min-h-screen bg-background text-foreground">
      {googleFontHref(site.theme.font) ? <link rel="stylesheet" href={googleFontHref(site.theme.font)} /> : null}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-3">
          {preview ? (
            <div className="flex h-8 items-center gap-2 font-semibold tracking-tight">
              {site.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={site.logoUrl} alt={site.name} className="h-8 max-w-[11rem] object-contain object-left" />
              ) : (
                <>
                  <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-[11px] text-background">{site.name.slice(0, 1)}</span>
                  {site.name}
                </>
              )}
            </div>
          ) : (
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
          )}
          <nav className="mr-12 flex items-center gap-4 text-sm">
            <LanguageToggle />
            {menu.map((item) => <a key={item.id} className={navLink} href={`#${item.id}`} onClick={jump}>{item.label}</a>)}
            <ProfileMenu email={viewer?.email} dashboard={Boolean(viewer?.role)} />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-5 py-6">
        <div className="relative overflow-hidden rounded-[16px]">
          {site.hero.landingImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.hero.landingImageUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ opacity: site.hero.backgroundOpacity / 100 }} />
          ) : null}
          <div className={`relative grid items-start gap-6 p-4 lg:p-5 ${site.hero.showCalendar ? "lg:grid-cols-[minmax(0,0.28fr)_minmax(0,0.44fr)_minmax(0,0.28fr)]" : site.hero.showPortrait ? "lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]" : ""}`}>
            {site.hero.showPortrait ? (
            <aside className={site.hero.showCalendar ? "lg:col-start-1" : ""}>
              <div className="panel relative min-h-[420px] overflow-hidden bg-surface">
                {site.hero.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={site.hero.imageUrl} alt={site.hero.alt || ""} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${site.hero.focalX}% ${site.hero.focalY}%` }} />
                ) : (
                  <div className="grid min-h-[420px] place-items-center text-4xl font-semibold">{site.name.slice(0, 1)}</div>
                )}
              </div>
            </aside>
            ) : null}
            <div className={`flex flex-col self-stretch ${site.hero.showCalendar && !site.hero.showPortrait ? "lg:col-span-2" : ""}`}>
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-[#9b9b94]">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                {site.category.toUpperCase()}
              </p>
              <h1 className="mt-3 text-[2.75rem] font-semibold leading-[0.95] tracking-tight">{site.name}</h1>
              {site.about.visible && site.about.short ? <p className="mt-1 max-w-sm text-[15px] leading-relaxed text-muted">{site.about.short}</p> : site.tagline ? <p className="mt-1 max-w-sm text-[15px] leading-relaxed text-muted">{site.tagline}</p> : null}
              <div id={site.hero.showCalendar ? "book-mobile" : "book"} className={site.hero.showCalendar ? "mt-auto pt-4 lg:hidden" : "mt-auto pt-4"}><BookingSheet site={site} today={today} label={site.hero.cta || t("booking.title")} preview={preview} /></div>
            </div>
            {site.hero.showCalendar ? (
              <div id="book" className="hidden lg:sticky lg:top-6 lg:col-start-3 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-auto">
                <BookingPanel site={site} today={today} frost preview={preview} />
              </div>
            ) : null}
          </div>
        </div>
        <article className="mt-8 flex flex-col gap-6">
          {site.navigation.map((item) => {
            const id = typeof item === "string" ? item : item.id;
            if (item === "about" && site.about.visible && site.about.short) {
              return (
                <section key={id} id="about" className="panel scroll-mt-6 p-6 md:p-8">
                  <SectionTitle>{site.navLabels.about || t("home.about")}</SectionTitle>
                  <p className="mt-5 max-w-3xl text-2xl font-semibold leading-snug tracking-tight">{site.about.short}</p>
                  {site.about.body ? <p className="mt-6 rounded-[14px] border border-[#e6e5df] bg-white p-5 text-sm leading-relaxed">{site.about.body}</p> : null}
                </section>
              );
            }
            if (item === "services" && site.services.length > 0) {
              return (
                <section key={id} id="services" className="panel scroll-mt-6 p-6 md:p-8">
                  <ServiceChart services={site.services} preview={preview} title={site.navLabels.services || t("home.services")} site={site} today={today} />
                </section>
              );
            }
            if (item === "contact") {
              return (
                <section key={id} id="contact" className="panel scroll-mt-6 p-6 md:p-8">
                  <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-stretch">
                    <div className="flex h-full flex-col">
                      <SectionTitle>{site.navLabels.contact || t("home.contact")}</SectionTitle>
                      {site.contact.address ? (
                        <div className="mt-4 min-h-[320px] flex-1 overflow-hidden rounded-[14px] border border-border bg-surface">
                          <ContactMap address={site.contact.address} name={site.name} theme={site.theme} />
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col lg:h-full lg:pt-[calc(2.25rem+1rem)]">
                      <div className="flex flex-col rounded-[14px] border border-[#e6e5df] bg-white p-5 lg:min-h-[320px] lg:flex-1">
                        <ContactForm databaseReady={site.databaseReady} fields={site.contactForm} />
                      </div>
                    </div>
                  </div>
                </section>
              );
            }
            if (item === "appointments") {
              return (
                <section key={id} id="appointments" className="panel scroll-mt-6 p-6 md:p-8">
                  <SectionTitle>{site.navLabels.appointments || t("nav.appointments")}</SectionTitle>
                  <p className="mt-5 max-w-3xl text-sm leading-relaxed">{t("home.appointmentsNote")}</p>
                </section>
              );
            }
            if (typeof item !== "string" && item.form) {
              return (
                <section key={id} id={item.id} className="panel scroll-mt-6 p-6 md:p-8">
                  <SectionTitle>{item.label}</SectionTitle>
                  {item.body ? <p className="mt-5 max-w-3xl text-sm leading-relaxed">{item.body}</p> : null}
                  <div className="mt-5 max-w-xl rounded-[14px] border border-[#e6e5df] bg-white p-5">
                    <PageForm pageId={item.id} fields={item.form} databaseReady={site.databaseReady} preview={preview} />
                  </div>
                </section>
              );
            }
            if (typeof item !== "string") {
              return (
                <section key={id} id={item.id} className="panel scroll-mt-6 p-6 md:p-8">
                  <SectionTitle>{item.label}</SectionTitle>
                  {item.body ? <p className="mt-5 max-w-3xl text-sm leading-relaxed">{item.body}</p> : null}
                </section>
              );
            }
            return null;
          })}
          {site.sections.includes("testimonials") ? (
            <section className="panel p-6 md:p-8">
              <SectionTitle>{t("home.testimonials")}</SectionTitle>
              {site.reviewSummary ? <p className="mt-4 text-sm font-semibold">{site.reviewSummary.rating.toFixed(1)} · {site.reviewSummary.count.toLocaleString()} {site.reviewSummary.label}</p> : null}
              {approved.length > 0 ? (
                <ReviewRow reviews={approved} fallback={site.reviewLinks.google} />
              ) : reviewSources.length === 0 ? (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{t("home.testimonialsEmpty")}</p>
              ) : null}
              {reviewSources.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {reviewSources.map((item) => <li key={item.href}><a href={item.href} target="_blank" rel="noreferrer" className="rounded-full border border-border px-3 py-1 text-sm">{item.label}</a></li>)}
                </ul>
              ) : null}
            </section>
          ) : null}
        </article>
      </main>
      <SiteFooter site={site} year={today.slice(0, 4) || "2026"} preview={preview} />
    </div>
  );
}
