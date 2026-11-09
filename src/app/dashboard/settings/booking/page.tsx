import { RulesBoard } from "@/components/dashboard/section-boards";
import { voidAction } from "@/lib/utils";
import { saveBookingRules } from "@/server/dashboard-actions";
import { translator } from "@/lib/i18n/server";
import { requireMember } from "@/server/guards";

export default async function Page() {
  const t = await translator();
  const { site } = await requireMember();
  return (
    <section>
      <h1 className="text-3xl font-semibold">{t("dash.rulesTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t("dash.rulesHint", { zone: site.timezone })}</p>
      <div className="mt-4"><RulesBoard site={site} t={t} /></div>
      <form action={voidAction(saveBookingRules)} className="mt-4 grid max-w-sm gap-2 text-sm">
        <label>{t("dash.horizon")}<input name="horizonDays" type="number" defaultValue={site.booking.horizonDays} className="w-full rounded-xl border border-border px-3 py-2" /></label>
        <label>{t("dash.notice")}<input name="minNotice" type="number" defaultValue={site.booking.minNoticeMinutes} className="w-full rounded-xl border border-border px-3 py-2" /></label>
        <label>{t("dash.interval")}<select name="interval" defaultValue={String(site.booking.slotIntervalMinutes)} className="w-full rounded-xl border border-border px-3 py-2">{[15, 20, 30, 60].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{t("dash.cancelCutoff")}<input name="cancelCutoff" type="number" defaultValue={site.booking.cancellationCutoffMinutes} className="w-full rounded-xl border border-border px-3 py-2" /></label>
        <label>{t("dash.rescheduleCutoff")}<input name="rescheduleCutoff" type="number" defaultValue={site.booking.rescheduleCutoffMinutes} className="w-full rounded-xl border border-border px-3 py-2" /></label>
        <button className="btn-primary" type="submit" disabled={!site.databaseReady}>{t("dash.saveRules")}</button>
      </form>
    </section>
  );
}
