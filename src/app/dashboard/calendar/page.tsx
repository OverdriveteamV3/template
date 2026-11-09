import Link from "next/link";
import { PageFrame } from "@/components/dashboard/page-frame";
import { WeekHours } from "@/components/dashboard/week-hours";
import { publishedDays } from "@/lib/dashboard/published-week";
import { blockTimeForm } from "@/server/dashboard-actions";
import { getLocale, translator } from "@/lib/i18n/server";
import { requireMember } from "@/server/guards";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const t = await translator();
  const locale = await getLocale();
  const { site } = await requireMember();
  const back = (
    <Link href="/dashboard/appointments" className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-semibold">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M15 6 9 12l6 6" />
      </svg>
      {t("dash.backAppointments")}
    </Link>
  );
  if (!site.databaseReady) {
    return (
      <PageFrame eyebrow={site.category.toUpperCase()} title={t("dash.calendar")} note={t("dash.calendarHint", { zone: site.timezone })} action={back}>
        <article data-dashboard-align className="panel p-5">
          <h2 className="text-sm font-semibold">{t("dash.hoursTitle")}</h2>
          <WeekHours locale={locale} zone={site.timezone} days={publishedDays(site)} appointments={null} />
        </article>
        <p className="text-xs text-muted">{t("dash.calendarWait")}</p>
      </PageFrame>
    );
  }
  const supabase = await createClient();
  const { data: appointments } = await supabase.from("appointments").select("id, starts_at, ends_at, status, source").eq("tenant_id", site.tenantId).gte("starts_at", new Date().toISOString()).order("starts_at").limit(50);
  const { data: blocks } = await supabase.from("blocked_times").select("id, starts_at, ends_at, reason").eq("tenant_id", site.tenantId).gte("ends_at", new Date().toISOString()).order("starts_at").limit(50);
  return (
    <section>
      {back}
      <p className="mt-4 text-xs text-muted">{t("dash.calendarHint", { zone: site.timezone })}</p>
      <ul className="mt-4 divide-y divide-border text-sm">
        {(appointments ?? []).map((item) => <li key={item.id} className="py-2">{new Date(item.starts_at).toLocaleString(locale)} · {item.status} · {item.source}</li>)}
        {(blocks ?? []).map((item) => <li key={item.id} className="py-2 text-muted">{new Date(item.starts_at).toLocaleString(locale)} · {t("dash.blocked")} · {item.reason}</li>)}
        {(appointments ?? []).length + (blocks ?? []).length === 0 ? <li className="py-3 text-muted">{t("dash.nothingUpcoming")}</li> : null}
      </ul>
      <form action={blockTimeForm} className="panel mt-6 grid gap-2 p-4 text-sm">
        <h2 className="font-semibold">{t("dash.blockTime")}</h2>
        <select name="staffId" className="rounded-xl border border-border px-3 py-2">{site.staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>
        <input name="startsAt" type="datetime-local" required className="rounded-xl border border-border px-3 py-2" />
        <input name="endsAt" type="datetime-local" required className="rounded-xl border border-border px-3 py-2" />
        <input name="reason" placeholder={t("dash.reason")} className="rounded-xl border border-border px-3 py-2" />
        <button className="btn-primary" type="submit">{t("dash.block")}</button>
      </form>
    </section>
  );
}
