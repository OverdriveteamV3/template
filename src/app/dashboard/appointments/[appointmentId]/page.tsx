import { notFound } from "next/navigation";
import { voidAction } from "@/lib/utils";
import { setStatus } from "@/server/dashboard-actions";
import { getLocale, translator } from "@/lib/i18n/server";
import { requireMember } from "@/server/guards";
import { createClient } from "@/lib/supabase/server";

export default async function Page({ params }: { params: Promise<{ appointmentId: string }> }) {
  const t = await translator();
  const locale = await getLocale();
  const { appointmentId } = await params;
  const { site } = await requireMember();
  const supabase = await createClient();
  const { data } = await supabase.from("appointments").select("id, starts_at, ends_at, status, timezone, source, customer_note").eq("id", appointmentId).eq("tenant_id", site.tenantId).maybeSingle();
  if (!data) notFound();
  const { data: events } = await supabase.from("appointment_events").select("id, event_type, created_at, to_status").eq("appointment_id", data.id).order("created_at");
  return (
    <section>
      <h2 className="text-xl font-semibold">{data.status}</h2>
      <p className="mt-2 text-sm">{new Date(data.starts_at).toLocaleString(locale)} · {data.timezone} · {data.source}</p>
      {data.customer_note ? <p className="mt-2 text-sm">{data.customer_note}</p> : null}
      <form action={voidAction(setStatus)} className="mt-4 flex gap-2">
        <input type="hidden" name="appointmentId" value={data.id} />
        <select name="status" className="rounded-xl border border-border px-3 py-2"><option value="completed">{t("dash.completed")}</option><option value="no_show">{t("dash.noShow")}</option><option value="cancelled">{t("dash.cancelled")}</option></select>
        <button className="rounded-xl bg-foreground px-3 py-2 text-background" type="submit">{t("dash.update")}</button>
      </form>
      <ol className="mt-6 space-y-2 text-sm">{(events ?? []).map((event) => <li key={event.id}>{event.event_type} · {event.to_status}</li>)}</ol>
    </section>
  );
}
