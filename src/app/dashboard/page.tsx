import { OverviewBoard } from "@/components/dashboard/overview-board";
import { createClient } from "@/lib/supabase/server";
import { getLocale, translator } from "@/lib/i18n/server";
import { requireMember } from "@/server/guards";
import { DateTime } from "luxon";
import { connection } from "next/server";

export default async function Page() {
  const t = await translator();
  const locale = await getLocale();
  const { site } = await requireMember();
  if (!site.databaseReady) return <OverviewBoard site={site} locale={locale} t={t} live={null} appointments={null} />;
  await connection();
  const now = DateTime.now().setZone(site.timezone);
  const sunday = now.minus({ days: now.weekday % 7 }).startOf("day");
  const nextSunday = sunday.plus({ days: 7 });
  const supabase = await createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [{ data: today }, upcoming, unread, week] = await Promise.all([
    supabase.from("appointments").select("id, starts_at, status").eq("tenant_id", site.tenantId).gte("starts_at", start.toISOString()).lt("starts_at", new Date(start.getTime() + 86400000).toISOString()),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("tenant_id", site.tenantId).eq("status", "confirmed").gte("starts_at", new Date().toISOString()),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("tenant_id", site.tenantId).eq("status", "unread"),
    supabase.from("appointments").select("id, starts_at, ends_at, status").eq("tenant_id", site.tenantId).gte("starts_at", sunday.toUTC().toISO()).lt("starts_at", nextSunday.toUTC().toISO()).order("starts_at"),
  ]);
  return (
    <OverviewBoard
      site={site}
      locale={locale}
      t={t}
      live={{ today: today ?? [], upcoming: upcoming.count ?? 0, unread: unread.count ?? 0 }}
      appointments={(week.data ?? []).map((item) => ({
        id: item.id,
        weekday: DateTime.fromISO(item.starts_at, { zone: site.timezone }).weekday % 7,
        startsAt: item.starts_at,
        endsAt: item.ends_at,
        status: item.status,
      }))}
    />
  );
}
