import { DateTime } from "luxon";
import { generateSchedule } from "@/lib/availability/slots";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getRequestContext } from "@/server/site";

export async function GET(request: Request) {
  const context = await getRequestContext();
  if (context.kind !== "site") return Response.json({ error: "unknown_tenant" }, { status: 404 });
  const url = new URL(request.url);
  const serviceId = url.searchParams.get("serviceId") ?? "";
  const staffId = url.searchParams.get("staffId") ?? "any";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) return Response.json({ error: "missing_range" }, { status: 400 });
  const service = context.site.services.find((item) => item.id === serviceId);
  if (!service) return Response.json({ slots: [] });
  const staff = context.site.staff.filter((person) => person.serviceIds.includes(serviceId));
  let busy: { staffId: string; start: string; end: string }[] = [];
  if (context.site.databaseReady && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_busy", {
      p_slug: context.site.slug,
      p_from: from,
      p_to: to,
    });
    if (error || data == null) return Response.json({ error: "unavailable" }, { status: 400 });
    busy = data as typeof busy;
  }
  const { slots, taken } = generateSchedule({
    rangeStart: new Date(from),
    rangeEnd: new Date(to),
    businessTimezone: context.site.timezone,
    durationMinutes: service.durationMinutes,
    bufferBefore: service.bufferBefore,
    bufferAfter: service.bufferAfter,
    intervalMinutes: context.site.booking.slotIntervalMinutes,
    minNoticeMinutes: context.site.booking.minNoticeMinutes,
    horizonDays: context.site.booking.horizonDays,
    now: DateTime.now().toJSDate(),
    closedDates: context.site.closedDates,
    staff,
    busy,
    staffFilter: staffId || "any",
  });
  return Response.json({ slots, taken, timezone: context.site.timezone }, { headers: { "cache-control": "private, no-store" } });
}
