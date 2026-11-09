import { OverviewBoard, type ActivityItem } from "@/components/dashboard/overview-board";
import { MASTER_USER_ID } from "@/lib/auth/master";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getLocale, translator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";
import { requireMember } from "@/server/guards";
import { openDaysInMonth } from "@/lib/dashboard/published-week";
import { DateTime } from "luxon";
import { cookies } from "next/headers";
import { connection } from "next/server";

function activityCutoff(raw: string | undefined, tenantId: string) {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as { tenantId?: string; at?: string };
    return parsed.tenantId === tenantId && parsed.at ? parsed.at : "";
  } catch {
    return "";
  }
}

function activityStatus(t: (key: MessageKey) => string, status: string) {
  if (status === "confirmed") return t("dash.confirmed");
  if (status === "completed") return t("dash.completed");
  if (status === "no_show") return t("dash.noShow");
  if (status === "cancelled") return t("dash.cancelled");
  if (status === "published") return t("dash.activityPublished");
  if (status === "unread") return t("dash.activityUnread");
  return status.replaceAll("_", " ");
}

export default async function Page() {
  const t = await translator();
  const locale = await getLocale();
  const { site, viewer } = await requireMember();
  await connection();
  const now = DateTime.now().setZone(site.timezone);
  const openDays = openDaysInMonth(site, now);
  if (!site.databaseReady) return <OverviewBoard site={site} locale={locale} t={t} live={null} appointments={null} openDays={openDays} activity={[]} />;
  const reader = viewer.id === MASTER_USER_ID ? createAdminClient() : await createClient();
  const [booked, forms, versions] = await Promise.all([
    reader.from("appointments").select("id, created_at, status").eq("tenant_id", site.tenantId).order("created_at", { ascending: false }).limit(60),
    reader.from("submissions").select("id, created_at, status, kind").eq("tenant_id", site.tenantId).order("created_at", { ascending: false }).limit(60),
    reader.from("website_versions").select("id, created_at, status, version").eq("tenant_id", site.tenantId).order("created_at", { ascending: false }).limit(60),
  ]);
  const cleared = activityCutoff((await cookies()).get("overdrive_activity_cleared")?.value, site.tenantId);
  const activity: ActivityItem[] = [
    ...(booked.data ?? []).map((item) => ({ id: `appointment-${item.id}`, href: `/dashboard/appointments/${item.id}`, title: t("dash.activityAppointment"), detail: activityStatus(t, item.status), at: item.created_at })),
    ...(forms.data ?? []).map((item) => ({ id: `submission-${item.id}`, href: `/dashboard/submissions/${item.id}`, title: t("dash.activitySubmission"), detail: item.kind ? `${activityStatus(t, item.status)} · ${item.kind}` : activityStatus(t, item.status), at: item.created_at })),
    ...(versions.data ?? []).map((item) => ({ id: `website-${item.id}`, href: "/dashboard/settings/website", title: t("dash.activityWebsite"), detail: `${activityStatus(t, item.status)} · v${item.version}`, at: item.created_at })),
  ].filter((item) => !cleared || item.at > cleared).sort((a, b) => b.at.localeCompare(a.at));
  const sunday = now.minus({ days: now.weekday % 7 }).startOf("day");
  const nextSunday = sunday.plus({ days: 7 });
  const supabase = await createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [{ data: today }, upcoming, unread, week] = await Promise.all([
    reader.from("appointments").select("id, starts_at, status").eq("tenant_id", site.tenantId).gte("starts_at", start.toISOString()).lt("starts_at", new Date(start.getTime() + 86400000).toISOString()).order("starts_at"),
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
      openDays={openDays}
      activity={activity}
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
