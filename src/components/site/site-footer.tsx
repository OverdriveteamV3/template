"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { PoweredBy } from "@/components/site/powered-by";
import { useT } from "@/components/i18n/locale-provider";
import { menuEntries, type PublicSite } from "@/lib/site/types";

function SocialIcon({ label }: { label: string }) {
  const name = label.toLowerCase();
  if (name.includes("instagram")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name.includes("facebook")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M14.5 8.5V6.8c0-.7.5-1 1.2-1H17V3h-2.1C12.2 3 11 4.4 11 6.6v1.9H9v2.7h2V21h3.5v-9.8h2.3l.4-2.7h-2.7Z" />
      </svg>
    );
  }
  if (name.includes("tiktok")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M14 4c.4 2.4 1.8 4 4.2 4.3v2.4c-1.5 0-2.8-.5-4.2-1.4v6.2a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v2.6a2.9 2.9 0 1 0 2 2.8V4H14Z" />
      </svg>
    );
  }
  if (name === "x" || name.includes("twitter")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M5 5.5 10.2 12 5.2 18.5h1.8l4-5.2 3.6 5.2H19l-5.4-7 4.8-6H16.6l-3.6 4.7L9.8 5.5H5Z" />
      </svg>
    );
  }
  if (name.includes("youtube")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M20 8.2a2.5 2.5 0 0 0-1.8-1.8C16.6 6 12 6 12 6s-4.6 0-6.2.4A2.5 2.5 0 0 0 4 8.2 26 26 0 0 0 3.6 12a26 26 0 0 0 .4 3.8 2.5 2.5 0 0 0 1.8 1.8C7.4 18 12 18 12 18s4.6 0 6.2-.4a2.5 2.5 0 0 0 1.8-1.8 26 26 0 0 0 .4-3.8 26 26 0 0 0-.4-3.8ZM10.6 14.8V9.2L15.2 12l-4.6 2.8Z" />
      </svg>
    );
  }
  if (name.includes("linkedin")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M6.5 9.5H4V20h2.5V9.5ZM5.2 4A1.5 1.5 0 1 0 5.2 7a1.5 1.5 0 0 0 0-3ZM20 20h-2.5v-5.6c0-1.6-.6-2.4-1.8-2.4s-2 .9-2 2.5V20H11.2V9.5h2.4v1.4c.5-.8 1.6-1.6 3.3-1.6 2.3 0 3.1 1.5 3.1 4.2V20Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="m5 7 7 6 7-6" />
    </svg>
  );
}

function FooterLine({ icon: Icon, children, muted = false }: { icon: LucideIcon; children: ReactNode; muted?: boolean }) {
  return (
    <p className={`flex items-start gap-2.5 ${muted ? "text-white/60" : ""}`}>
      <Icon size={15} strokeWidth={1.8} className="mt-1 shrink-0 text-primary" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function SiteFooter({ site, year, preview = false }: { site: PublicSite; year: string; preview?: boolean }) {
  const t = useT();
  const socials = site.contact.socials.filter((item) => item.href);
  const menu = menuEntries(site.navigation, { services: site.navLabels.services || t("nav.services"), about: site.navLabels.about || t("nav.about"), contact: site.navLabels.contact || t("nav.contact"), appointments: site.navLabels.appointments || t("nav.appointments") });
  return (
    <footer className="mt-10 bg-[#111] text-white">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-8 py-12 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(160px,220px)] md:items-start md:gap-x-16 md:px-14">
        <div>
          {site.logoInFooter && site.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logoUrl} alt={site.name} className="mb-3 h-8 max-w-[11rem] object-contain object-left" />
          ) : null}
          <p className="text-lg font-semibold tracking-tight">{site.name}</p>
          {site.tagline ? <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/70">{site.tagline}</p> : null}
          {socials.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {socials.map((social) => {
                const external = /^https?:/i.test(social.href);
                return (
                  <li key={`${social.label}-${social.href}`}>
                    <a href={social.href} aria-label={social.label} className="grid h-10 w-10 place-items-center rounded-full border border-primary bg-primary text-on-primary transition-colors hover:border-white hover:bg-white hover:text-[#111]" {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
                      <SocialIcon label={social.label} />
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        <div className="space-y-1 text-sm leading-6">
          {site.contact.address ? <FooterLine icon={MapPin}>{site.contact.address}</FooterLine> : null}
          {site.contact.phone ? <FooterLine icon={Phone}><a href={`tel:${site.contact.phone}`}>{site.contact.phone}</a></FooterLine> : null}
          {site.contact.email ? <FooterLine icon={Mail}><a href={`mailto:${site.contact.email}`}>{site.contact.email}</a></FooterLine> : null}
          {site.contact.hours ? <FooterLine icon={Clock} muted>{site.contact.hours}</FooterLine> : null}
        </div>
        <nav className="flex flex-col gap-3 text-sm md:pl-6">
          {menu.map((item) => <Link key={item.id} href={preview ? `#${item.id}` : `/#${item.id}`} className="hover:text-white/70">{item.label}</Link>)}
        </nav>
      </div>
      <div className="border-t border-white/10 px-8 py-4 md:px-14 [&_a]:!text-white/70 [&_a]:decoration-white/25 [&_a:hover]:!text-primary [&_a:hover]:!decoration-primary [&_p]:!text-white/60">
        <div className="mx-auto grid max-w-[1280px] items-center gap-3 sm:grid-cols-3">
          <p className="text-xs text-white/60">{site.name}. {t("footer.rights")} {year}.</p>
          <PoweredBy />
          <span className="hidden sm:block" aria-hidden />
        </div>
      </div>
    </footer>
  );
}
