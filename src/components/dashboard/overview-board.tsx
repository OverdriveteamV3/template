import type { MessageKey } from "@/lib/i18n/messages";
import type { PublicSite } from "@/lib/site/types";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { WeekHours, type WeekAppointment } from "@/components/dashboard/week-hours";
import { publishedDays } from "@/lib/dashboard/published-week";

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

type Live = {
  today: { id: string; starts_at: string; status: string }[];
  upcoming: number;
  unread: number;
};

function splitMinutes(minutes: number) {
  if (minutes > 0 && minutes % 60 === 0) return { value: minutes / 60, hours: true };
  return { value: minutes, hours: false };
}

function money(cents: number) {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function OverviewBoard({ site, locale, t, live, appointments }: { site: PublicSite; locale: string; t: Translate; live: Live | null; appointments: WeekAppointment[] | null }) {
  const days = publishedDays(site);
  const longestService = Math.max(...site.services.map((service) => service.durationMinutes), 1);
  const openDays = days.filter((day) => day.minutes > 0).length;
  const notice = splitMinutes(site.booking.minNoticeMinutes);
  const cancel = splitMinutes(site.booking.cancellationCutoffMinutes);

  return (
    <section className="space-y-4">
      <header>
        <p className="text-[10px] font-semibold tracking-[0.18em] text-muted">{site.category.toUpperCase()}</p>
        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">{t("dash.overview")}</h1>
          <LanguageToggle />
        </div>
        <p className="mt-1 text-sm text-muted">{site.name} · {site.timezone}</p>
      </header>

      {live ? (
        <div data-dashboard-align className="grid gap-3 md:grid-cols-3">
          <Metric value={live.today.length} label={t("dash.today")} />
          <Metric value={live.upcoming} label={t("dash.upcoming")} />
          <Metric value={live.unread} label={t("dash.unread")} />
        </div>
      ) : null}

      <div data-dashboard-align={live ? undefined : true} className="grid gap-3 md:grid-cols-3">
        <Metric value={site.services.length} label={t("dash.services")} />
        <Metric value={site.staff.length} label={t("dash.staff")} />
        <Metric value={openDays} label={t("dash.openDays")} />
      </div>
      <p className="text-xs text-muted">{t("dash.catalogNote")}</p>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <article className="panel p-5">
          <h2 className="text-sm font-semibold">{t("dash.serviceMix")}</h2>
          {site.services.length === 0 ? <p className="mt-4 text-sm text-muted">{t("dash.servicesPreview")}</p> : (
            <ul className="mt-4 space-y-4">
              {site.services.map((service, index) => (
                <li key={service.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{service.name}</span>
                    <span className="shrink-0 text-muted">
                      {service.durationMinutes} {t("dash.minShort")}
                      {service.showPrice && service.priceCents != null ? ` · ${money(service.priceCents)}` : ""}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full" style={{ width: `${(service.durationMinutes / longestService) * 100}%`, background: index % 2 === 0 ? "var(--primary)" : "var(--secondary)" }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel p-5">
          <h2 className="text-sm font-semibold">{t("dash.hoursTitle")}</h2>
          <p className="mt-1 text-xs text-muted">{t("dash.hoursFrom")}</p>
          <WeekHours
            locale={locale}
            zone={site.timezone}
            appointments={appointments}
            days={days}
          />
        </article>
      </div>

      <article className="panel p-5">
        <h2 className="text-sm font-semibold">{t("dash.windowTitle")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <WindowFact value={site.booking.horizonDays} label={t("dash.horizon")} />
          <WindowFact value={notice.value} label={t(notice.hours ? "dash.hoursNotice" : "dash.minutesNotice")} />
          <WindowFact value={site.booking.slotIntervalMinutes} label={t("dash.minuteSlots")} />
          <WindowFact value={cancel.value} label={t(cancel.hours ? "dash.hoursCancel" : "dash.minutesCancel")} />
        </div>
      </article>

      {live ? (
        <article className="panel p-5">
          <h2 className="text-sm font-semibold">{t("dash.today")}</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {live.today.length === 0 ? <li className="py-3 text-muted">{t("dash.noneToday")}</li> : live.today.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <span>{new Date(item.starts_at).toLocaleTimeString(locale)}</span>
                <span className="text-muted">{item.status}</span>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </section>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <article className="panel p-4">
      <p className="text-4xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
      <div className="mt-3 h-1.5 w-10 rounded-full bg-primary" aria-hidden />
    </article>
  );
}

function WindowFact({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
