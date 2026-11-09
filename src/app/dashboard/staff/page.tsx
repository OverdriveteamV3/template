import { StaffBoard } from "@/components/dashboard/section-boards";
import { voidAction } from "@/lib/utils";
import { saveStaff } from "@/server/dashboard-actions";
import { translator } from "@/lib/i18n/server";
import { requireMember } from "@/server/guards";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const t = await translator();
  const { site } = await requireMember();
  if (!site.databaseReady) return <StaffBoard site={site} t={t} />;
  const supabase = await createClient();
  const { data } = await supabase.from("staff").select("id, display_name, active, archived_at").eq("tenant_id", site.tenantId);
  return (
    <section>
      <ul className="text-sm">{(data ?? []).map((person) => <li key={person.id}>{person.display_name}{person.archived_at ? ` · ${t("common.archived")}` : ""}</li>)}</ul>
      <form action={voidAction(saveStaff)} className="panel mt-6 grid gap-2 p-4 text-sm">
        <input name="name" required placeholder={t("common.name")} className="rounded-xl border border-border px-3 py-2" />
        <input name="email" type="email" placeholder={t("dash.emailOptional")} className="rounded-xl border border-border px-3 py-2" />
        <fieldset className="flex flex-wrap gap-2">{[0, 1, 2, 3, 4, 5, 6].map((day) => <label key={day} className="text-xs"><input type="checkbox" name="weekday" value={day} defaultChecked={day > 0 && day < 6} /> {[t("dash.sun"), t("dash.mon"), t("dash.tue"), t("dash.wed"), t("dash.thu"), t("dash.fri"), t("dash.sat")][day]}</label>)}</fieldset>
        <button className="btn-primary" type="submit">{t("dash.addStaff")}</button>
      </form>
    </section>
  );
}
