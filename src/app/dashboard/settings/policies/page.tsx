import Link from "next/link";
import { translator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";
import { voidAction } from "@/lib/utils";
import { requireMember } from "@/server/guards";
import { savePolicy } from "@/server/dashboard-actions";
import { createClient } from "@/lib/supabase/server";

const kinds = [
  ["privacy", "dash.privacy"],
  ["terms", "dash.terms"],
  ["cancellation", "dash.cancellation"],
] as const satisfies ReadonlyArray<readonly [string, MessageKey]>;

const field = "w-full rounded-xl border border-border px-3 py-2";

export default async function Page() {
  const t = await translator();
  const { site } = await requireMember();
  const current = new Map<string, { title: string; body: string; required: boolean }>();
  if (site.databaseReady) {
    const supabase = await createClient();
    const { data: documents } = await supabase.from("policy_documents").select("id, slug").eq("tenant_id", site.tenantId);
    const ids = (documents ?? []).map((item) => item.id);
    const { data: versions } = ids.length
      ? await supabase.from("policy_versions").select("document_id, title, body, required_for_booking, status").in("document_id", ids).eq("status", "published").order("version", { ascending: false })
      : { data: [] };
    for (const document of documents ?? []) {
      const version = (versions ?? []).find((item) => item.document_id === document.id);
      if (version) current.set(document.slug, { title: version.title, body: version.body, required: version.required_for_booking });
    }
  }
  const editable = site.databaseReady;
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm text-muted">{t("dash.policiesHint")}</p>
        {editable ? null : <p className="mt-2 text-xs text-muted">{t("dash.policiesWait")}</p>}
      </div>
      {kinds.map(([kind, label]) => {
        const value = current.get(kind);
        return (
          <form key={kind} action={editable ? voidAction(savePolicy) : undefined} className="panel grid gap-2 p-4 text-sm">
            <fieldset disabled={!editable} className="grid gap-2 disabled:opacity-80">
              <h2 className="text-lg font-semibold">{t(label)}</h2>
              {value ? null : <p className="text-xs text-muted">{t("dash.notPublished")}</p>}
              <input type="hidden" name="kind" value={kind} />
              <label className="grid gap-1">
                {t("dash.policyTitleLabel")}
                <input name="title" defaultValue={value?.title ?? ""} className={field} />
              </label>
              <label className="grid gap-1">
                {t(label)}
                <textarea name="body" defaultValue={value?.body ?? ""} rows={6} className={field} />
              </label>
              <label className="flex gap-2"><input name="required" type="checkbox" defaultChecked={value?.required ?? false} /> {t("dash.requiredBooking")}</label>
              <button className="btn-primary w-fit disabled:opacity-50" type="submit" disabled={!editable}>{t("dash.savePolicy")}</button>
            </fieldset>
          </form>
        );
      })}
      <Link href="/dashboard/settings/website" className="text-sm font-semibold">{t("dash.websiteTitle")}</Link>
    </section>
  );
}
