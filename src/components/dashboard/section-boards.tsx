import Link from "next/link";
import type { MessageKey } from "@/lib/i18n/messages";
import type { PublicSite, PublicStaff } from "@/lib/site/types";
import { PageFrame, Stat } from "@/components/dashboard/page-frame";

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

function money(cents: number) {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

const dayKeys = ["dash.sun", "dash.mon", "dash.tue", "dash.wed", "dash.thu", "dash.fri", "dash.sat"] as const satisfies readonly MessageKey[];
const statuses = ["dash.confirmed", "dash.completed", "dash.noShow", "dash.cancelled"] as const satisfies readonly MessageKey[];

export function ServiceBoard({ site, t }: { site: PublicSite; t: Translate }) {
  const longest = Math.max(...site.services.map((service) => service.durationMinutes), 1);
  return (
    <PageFrame eyebrow={site.category.toUpperCase()} title={t("dash.services")} note={t("dash.servicesPreview")}>
      <div data-dashboard-align className="grid gap-3 sm:grid-cols-3">
        <Stat value={site.services.length} label={t("dash.services")} />
        <Stat value={longest} label={t("common.minutes")} />
        <Stat value={site.services.filter((service) => service.showPrice).length} label={t("dash.showPrice")} />
      </div>
      <ul className="panel space-y-4 p-5">
        {site.services.map((service, index) => (
          <li key={service.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{service.name}</span>
              <span className="text-muted">{service.durationMinutes} {t("dash.minShort")}{service.showPrice && service.priceCents != null ? ` · ${money(service.priceCents)}` : ""}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{service.description}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full" style={{ width: `${(service.durationMinutes / longest) * 100}%`, background: index % 2 === 0 ? "var(--primary)" : "var(--secondary)" }} />
            </div>
          </li>
        ))}
      </ul>
    </PageFrame>
  );
}

export function StaffBoard({ site, t }: { site: PublicSite; t: Translate }) {
  return (
    <PageFrame eyebrow={site.category.toUpperCase()} title={t("dash.staffHours")} note={t("dash.hoursFrom")}>
      <div className="grid gap-3">
        {site.staff.map((person, index) => <StaffCard key={person.id} person={person} services={site.services.filter((service) => person.serviceIds.includes(service.id)).length} t={t} align={index === 0} />)}
      </div>
      <p className="text-xs text-muted">{t("dash.staffWait")}</p>
    </PageFrame>
  );
}

function StaffCard({ person, services, t, align }: { person: PublicStaff; services: number; t: Translate; align: boolean }) {
  const days = dayKeys.map((key, weekday) => person.hours.some((item) => item.weekday === weekday));
  return (
    <article data-dashboard-align={align ? true : undefined} className="panel p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{person.name}</h2>
        <p className="text-xs text-muted">{person.timezone}</p>
      </div>
      <p className="mt-1 text-xs text-muted">{services} {t("dash.services")}</p>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((open, index) => (
          <div key={dayKeys[index]} className="text-center">
            <div className="mx-auto h-10 w-full rounded-md" style={{ background: open ? "var(--primary)" : "var(--border)" }} />
            <p className="mt-1 text-[10px] font-semibold">{t(dayKeys[index])}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export function FormsBoard({ t }: { t: Translate }) {
  const kinds = ["dash.contactForm", "dash.quote", "dash.intake"] as const satisfies readonly MessageKey[];
  const fields = ["common.name", "common.email", "common.message"] as const satisfies readonly MessageKey[];
  return (
    <PageFrame title={t("dash.formsTitle")} note={t("dash.formsHint")}>
      <div data-dashboard-align className="grid gap-3 md:grid-cols-3">
        {kinds.map((kind) => (
          <article key={kind} className="panel p-5">
            <h2 className="text-sm font-semibold">{t(kind)}</h2>
            <ul className="mt-4 space-y-3">
              {fields.map((field, index) => (
                <li key={field}>
                  <p className="text-xs text-muted">{t(field)}</p>
                  <div className="mt-1 h-2 rounded-full bg-white">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${70 + index * 10}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </PageFrame>
  );
}

export function NotificationBoard({ site, t }: { site: PublicSite; t: Translate }) {
  return (
    <PageFrame eyebrow={site.category.toUpperCase()} title={t("dash.notificationsTitle")} note={t("dash.notificationsHint")}>
      <article data-dashboard-align className="panel p-5">
        <p className="text-xs text-muted">{t("dash.publicEmail")}</p>
        <p className="mt-1 text-lg font-semibold">{site.contact.email}</p>
      </article>
      <p className="text-xs text-muted">{t("dash.notificationsWait")}</p>
    </PageFrame>
  );
}

export function AppointmentBoard({ site, t }: { site: PublicSite; t: Translate }) {
  return (
    <PageFrame eyebrow={site.category.toUpperCase()} title={t("dash.appointments")} note={t("dash.noLive")} action={<Link href="/dashboard/calendar" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary">{t("dash.calendar")}</Link>}>
      <div data-dashboard-align className="grid gap-3 sm:grid-cols-4">
        {statuses.map((status) => (
          <article key={status} className="panel p-4">
            <p className="text-sm font-medium">{t(status)}</p>
            <div className="mt-4 h-2 w-6 rounded-full bg-border" />
          </article>
        ))}
      </div>
      <p className="text-xs text-muted">{site.timezone}</p>
    </PageFrame>
  );
}

export function RulesBoard({ site, t }: { site: PublicSite; t: Translate }) {
  const notice = site.booking.minNoticeMinutes > 0 && site.booking.minNoticeMinutes % 60 === 0 ? site.booking.minNoticeMinutes / 60 : site.booking.minNoticeMinutes;
  const cancel = site.booking.cancellationCutoffMinutes > 0 && site.booking.cancellationCutoffMinutes % 60 === 0 ? site.booking.cancellationCutoffMinutes / 60 : site.booking.cancellationCutoffMinutes;
  const noticeLabel = site.booking.minNoticeMinutes % 60 === 0 ? "dash.hoursNotice" : "dash.minutesNotice";
  const cancelLabel = site.booking.cancellationCutoffMinutes % 60 === 0 ? "dash.hoursCancel" : "dash.minutesCancel";
  return (
    <div data-dashboard-align className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat value={site.booking.horizonDays} label={t("dash.horizon")} />
      <Stat value={notice} label={t(noticeLabel)} />
      <Stat value={site.booking.slotIntervalMinutes} label={t("dash.minuteSlots")} />
      <Stat value={cancel} label={t(cancelLabel)} />
    </div>
  );
}
export function CustomerBoard({ site, t }: { site: PublicSite; t: Translate }) {
  const fields = ["common.name", "common.email", "common.phone"] as const satisfies readonly MessageKey[];
  return (
    <PageFrame eyebrow={site.category.toUpperCase()} title={t("dash.customers")} note={t("dash.customersWait")}>
      <ul data-dashboard-align className="grid gap-3 md:grid-cols-3">
        {fields.map((field) => (
          <li key={field} className="panel p-4">
            <p className="text-sm font-medium">{t(field)}</p>
            <div className="mt-4 h-2 w-10 rounded-full bg-border" />
          </li>
        ))}
      </ul>
    </PageFrame>
  );
}

export function SubmissionBoard({ t }: { t: Translate }) {
  const kinds = ["dash.contactForm", "dash.quote", "dash.intake"] as const satisfies readonly MessageKey[];
  return (
    <PageFrame title={t("dash.submissions")} note={t("dash.submissionsWait")}>
      <div data-dashboard-align className="grid gap-3 md:grid-cols-3">
        {kinds.map((kind) => (
          <article key={kind} className="panel p-5">
            <h2 className="text-sm font-semibold">{t(kind)}</h2>
            <div className="mt-4 space-y-2">
              <div className="h-2 w-full rounded-full bg-border" />
              <div className="h-2 w-2/3 rounded-full bg-border" />
              <div className="h-2 w-1/3 rounded-full bg-border" />
            </div>
          </article>
        ))}
      </div>
    </PageFrame>
  );
}
