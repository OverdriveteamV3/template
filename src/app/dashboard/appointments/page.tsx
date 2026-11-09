import { AppointmentBoard } from "@/components/dashboard/section-boards";
import Link from "next/link";
import { getLocale, translator } from "@/lib/i18n/server";
import { requireMember } from "@/server/guards";
import { createClient } from "@/lib/supabase/server";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const t = await translator();
  const locale = await getLocale();
  const { site } = await requireMember();
  const query = await searchParams;
  if (!site.databaseReady) return <AppointmentBoard site={site} t={t} />;
  const supabase = await createClient();
  let request = supabase.from("appointments").select("id, starts_at, status, source").eq("tenant_id", site.tenantId).order("starts_at", { ascending: false }).limit(100);
  if (query.status) request = request.eq("status", query.status);
  const { data } = await request;
  const filtered = (data ?? []).filter((item) => !query.q || item.id.includes(query.q) || item.status.includes(query.q));
  return (
    <section>
      <form className="flex items-center gap-2 text-sm">
        <input name="q" defaultValue={query.q} placeholder={t("dash.search")} className="rounded-xl border border-border px-3 py-2" />
        <button className="rounded-xl border border-border px-3 py-2">{t("dash.searchButton")}</button>
        <Link href="/dashboard/calendar" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary">{t("dash.calendar")}</Link>
      </form>
      <ul className="mt-4 divide-y divide-border text-sm">
        {filtered.length === 0 ? <li className="py-3 text-muted">{t("dash.noMatch")}</li> : filtered.map((item) => <li key={item.id} className="py-2"><Link href={`/dashboard/appointments/${item.id}`}>{new Date(item.starts_at).toLocaleString(locale)} · {item.status}</Link></li>)}
      </ul>
    </section>
  );
}
