import "server-only";

import { MASTER_USER_ID } from "@/lib/auth/master";
import { getLocale, translator } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { DashboardAlert } from "@/lib/dashboard/alert";
import type { Viewer } from "@/server/site";
import type { PublicSite } from "@/lib/site/types";
import { cookies } from "next/headers";

export type { DashboardAlert };

function seenAt(raw: string | undefined, tenantId: string) {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as { tenantId?: string; at?: string };
    return parsed.tenantId === tenantId && parsed.at ? parsed.at : "";
  } catch {
    return "";
  }
}

function nameOf(value: { full_name?: string } | { full_name?: string }[] | null) {
  const row = Array.isArray(value) ? value[0] : value;
  return row?.full_name?.trim() ?? "";
}

function serviceOf(value: { name?: string } | { name?: string }[] | null) {
  const row = Array.isArray(value) ? value[0] : value;
  return row?.name?.trim() ?? "";
}

export async function loadAlerts(site: PublicSite, viewer: Viewer): Promise<DashboardAlert[]> {
  if (!site.databaseReady) return [];
  const t = await translator();
  const locale = await getLocale();
  const reader = viewer.id === MASTER_USER_ID ? createAdminClient() : await createClient();
  const [appointments, submissions, jar] = await Promise.all([
    reader.from("appointments").select("id, created_at, starts_at, status, tenant_customers(full_name), services(name)").eq("tenant_id", site.tenantId).eq("status", "confirmed").order("created_at", { ascending: false }).limit(6),
    reader.from("submissions").select("id, created_at, status, kind, customer_email").eq("tenant_id", site.tenantId).eq("status", "unread").order("created_at", { ascending: false }).limit(6),
    cookies(),
  ]);
  const seen = seenAt(jar.get("overdrive_alerts_seen")?.value, site.tenantId);
  const when = new Intl.DateTimeFormat(locale === "es" ? "es" : "en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: site.timezone });
  const alerts: DashboardAlert[] = [
    ...(appointments.data ?? []).map((item) => {
      const who = nameOf(item.tenant_customers as { full_name?: string } | { full_name?: string }[] | null);
      const service = serviceOf(item.services as { name?: string } | { name?: string }[] | null);
      const time = when.format(new Date(item.starts_at));
      return {
        id: `appointment-${item.id}`,
        href: `/dashboard/appointments/${item.id}`,
        title: t("dash.alertAppointment"),
        detail: [who, service, time].filter(Boolean).join(" · "),
        at: item.created_at,
        fresh: !seen || item.created_at > seen,
      };
    }),
    ...(submissions.data ?? []).map((item) => ({
      id: `submission-${item.id}`,
      href: `/dashboard/submissions/${item.id}`,
      title: t("dash.alertMessage"),
      detail: [item.kind, item.customer_email].filter(Boolean).join(" · "),
      at: item.created_at,
      fresh: !seen || item.created_at > seen,
    })),
  ];
  return alerts.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
}
