import { FormsBoard } from "@/components/dashboard/section-boards";
import { voidAction } from "@/lib/utils";
import { saveForm } from "@/server/dashboard-actions";
import { translator } from "@/lib/i18n/server";
import { requireMember } from "@/server/guards";

const starter = JSON.stringify({ fields: [{ id: "name", type: "short_text", label: "Name", required: true }, { id: "email", type: "email", label: "Email", required: true }, { id: "message", type: "long_text", label: "Message", required: true }] }, null, 2);

export default async function Page() {
  const t = await translator();
  await requireMember();
  return (
    <div className="space-y-4">
      <FormsBoard t={t} />
      <form action={voidAction(saveForm)} className="grid gap-2">
        <select name="kind" className="rounded-xl border border-border px-3 py-2"><option value="contact">{t("dash.contactForm")}</option><option value="quote">{t("dash.quote")}</option><option value="booking_intake">{t("dash.intake")}</option></select>
        <textarea name="schema" defaultValue={starter} rows={12} className="rounded-xl border border-border px-3 py-2 font-mono text-xs" />
        <button className="btn-primary" type="submit">{t("dash.saveForm")}</button>
      </form>
    </div>
  );
}
