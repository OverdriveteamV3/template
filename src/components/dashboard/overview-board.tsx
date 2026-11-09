import type { MessageKey } from "@/lib/i18n/messages";
import type { PublicSite } from "@/lib/site/types";
import { PagedList } from "@/components/dashboard/paged-list";
import { WeekHours, type WeekAppointment } from "@/components/dashboard/week-hours";
import { publishedDays } from "@/lib/dashboard/published-week";
import { clearActivityForm } from "@/server/dashboard-actions";

export type ActivityItem = {
  id: string;
  href: string;
  title: string;
  detail: string;
  at: string;
};

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

type Live = {
  today: { id: string; starts_at: string; status: string }[];
  upcoming: number;
  unread: number;
};

function money(cents: number) {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function OverviewBoard({ site, locale, t, live, appointments, openDays, activity }: { site: PublicSite; locale: string; t: Translate; live: Live | null; appointments: WeekAppointment[] | null; openDays: number; activity: ActivityItem[] }) {
  const days = publishedDays(site);
  const longestService = Math.max(...site.services.map((service) => service.durationMinutes), 1);

  return (
    <section className="space-y-4">
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

      <div className={live ? "grid items-start gap-4 lg:grid-cols-2" : ""}>
        <article className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">{t("dash.activity")}</h2>
            <form action={clearActivityForm}>
              <button className="rounded-xl border border-border bg-white px-3 py-1.5 text-sm font-semibold" type="submit">{t("dash.clearActivity")}</button>
            </form>
          </div>
          <PagedList
            zebra
            rows={activity.map((item) => ({
              id: item.id,
              href: item.href,
              primary: item.title,
              secondary: item.detail,
              time: new Date(item.at).toLocaleString(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
            }))}
            empty={t("dash.activityEmpty")}
            nextLabel={t("dash.nextPage")}
            previousLabel={t("dash.previousPage")}
          />
        </article>

        {live ? (
          <article className="panel p-5">
            <h2 className="text-sm font-semibold">{t("dash.today")}</h2>
            <PagedList
              rows={live.today.map((item) => ({
                id: item.id,
                primary: new Date(item.starts_at).toLocaleTimeString(locale),
                secondary: item.status,
              }))}
              empty={t("dash.noneToday")}
              nextLabel={t("dash.nextPage")}
              previousLabel={t("dash.previousPage")}
            />
          </article>
        ) : null}
      </div>
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

