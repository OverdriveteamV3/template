import { NotificationBoard } from "@/components/dashboard/section-boards";
import { saveNotificationsForm } from "@/server/dashboard-actions";
import { translator } from "@/lib/i18n/server";
import { requireMember } from "@/server/guards";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const t = await translator();
  const { site } = await requireMember();
  if (!site.databaseReady) return <NotificationBoard site={site} t={t} />;
  const supabase = await createClient();
  const { data } = await supabase.from("notification_settings").select("public_contact_email, reply_to, recipients, sender_mode").eq("tenant_id", site.tenantId).maybeSingle();
  const { data: failed } = await supabase.from("notification_outbox").select("id, event_type, last_error, status").eq("tenant_id", site.tenantId).in("status", ["failed", "dead"]).limit(10);
  return (
    <section>
      <p className="text-sm text-muted">{t("dash.notificationsHint")}</p>
      <form action={saveNotificationsForm} className="mt-4 grid gap-2 text-sm">
        <input name="publicEmail" defaultValue={data?.public_contact_email ?? ""} placeholder={t("dash.publicEmail")} className="rounded-xl border border-border px-3 py-2" />
        <input name="replyTo" defaultValue={data?.reply_to ?? ""} placeholder={t("dash.replyTo")} className="rounded-xl border border-border px-3 py-2" />
        <input name="recipients" defaultValue={(data?.recipients ?? []).join(", ")} placeholder={t("dash.recipients")} className="rounded-xl border border-border px-3 py-2" />
        <input name="requestedFrom" placeholder={t("dash.requestedFrom")} className="rounded-xl border border-border px-3 py-2" />
        <button className="btn-primary" type="submit">{t("common.save")}</button>
      </form>
      <h2 className="mt-6 font-semibold">{t("dash.failedDelivery")}</h2>
      <ul className="text-sm">{(failed ?? []).length === 0 ? <li className="text-muted">{t("dash.noFailed")}</li> : failed?.map((item) => <li key={item.id}>{item.event_type}: {item.last_error}</li>)}</ul>
    </section>
  );
}
