import { ServiceBoard } from "@/components/dashboard/section-boards";
import { voidAction } from "@/lib/utils";
import { archiveService, saveService } from "@/server/dashboard-actions";
import { translator } from "@/lib/i18n/server";
import { requireMember } from "@/server/guards";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const t = await translator();
  const { site } = await requireMember();
  if (!site.databaseReady) return <ServiceBoard site={site} t={t} />;
  const supabase = await createClient();
  const { data } = await supabase.from("services").select("id, name, duration_minutes, active, archived_at").eq("tenant_id", site.tenantId).order("sort_order");
  return (
    <section>
      <ul className="divide-y divide-border text-sm">
        {(data ?? []).map((service) => (
          <li key={service.id} className="flex items-center justify-between py-2">
            <span>{service.name} · {service.duration_minutes} {t("dash.minShort")} {service.archived_at ? `· ${t("common.archived")}` : ""}</span>
            {!service.archived_at ? <form action={voidAction(archiveService)}><input type="hidden" name="id" value={service.id} /><button type="submit">{t("dash.archive")}</button></form> : null}
          </li>
        ))}
      </ul>
      <form action={voidAction(saveService)} className="panel mt-6 grid gap-2 p-4 text-sm">
        <h2 className="font-semibold">{t("dash.newService")}</h2>
        <input name="name" required placeholder={t("common.name")} className="rounded-xl border border-border px-3 py-2" />
        <textarea name="description" placeholder={t("dash.description")} className="rounded-xl border border-border px-3 py-2" />
        <input name="duration" type="number" min={5} defaultValue={60} className="rounded-xl border border-border px-3 py-2" />
        <input name="price" type="number" min={0} step="0.01" placeholder={t("dash.price")} className="rounded-xl border border-border px-3 py-2" />
        <label className="flex gap-2"><input name="showPrice" type="checkbox" defaultChecked /> {t("dash.showPrice")}</label>
        <input name="bufferBefore" type="number" min={0} defaultValue={0} />
        <input name="bufferAfter" type="number" min={0} defaultValue={0} />
        <input name="location" placeholder={t("dash.location")} className="rounded-xl border border-border px-3 py-2" />
        <button className="btn-primary" type="submit">{t("dash.saveService")}</button>
      </form>
    </section>
  );
}
