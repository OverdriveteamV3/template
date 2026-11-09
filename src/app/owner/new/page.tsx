import { voidAction } from "@/lib/utils";
import { presets } from "@/lib/presets";
import { provisionBusiness } from "@/server/dashboard-actions";
import { translator } from "@/lib/i18n/server";
import { requirePlatformAdmin } from "@/server/guards";

export default async function Page() {
  const t = await translator();
  await requirePlatformAdmin();
  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <h1 className="text-3xl font-semibold">{t("owner.new")}</h1>
      <p className="mt-2 text-sm text-muted">{t("owner.hint")}</p>
      <form action={voidAction(provisionBusiness)} className="mt-4 grid gap-2 text-sm">
        <select name="preset" className="rounded-xl border border-border px-3 py-2">{presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select>
        <input name="name" required placeholder={t("owner.businessName")} className="rounded-xl border border-border px-3 py-2" />
        <input name="slug" required placeholder={t("owner.slug")} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="rounded-xl border border-border px-3 py-2" />
        <input name="timezone" defaultValue="America/New_York" className="rounded-xl border border-border px-3 py-2" />
        <input name="tagline" placeholder={t("owner.tagline")} className="rounded-xl border border-border px-3 py-2" />
        <input name="ownerEmail" type="email" placeholder={t("owner.ownerEmail")} className="rounded-xl border border-border px-3 py-2" />
        <input name="publicEmail" type="email" placeholder={t("owner.publicEmail")} className="rounded-xl border border-border px-3 py-2" />
        <input name="replyTo" type="email" placeholder={t("owner.replyTo")} className="rounded-xl border border-border px-3 py-2" />
        <input name="recipients" placeholder={t("owner.recipients")} className="rounded-xl border border-border px-3 py-2" />
        <input name="primary" defaultValue="#ddf20a" className="rounded-xl border border-border px-3 py-2" />
        <label className="flex gap-2"><input type="checkbox" name="publish" /> {t("owner.publishNow")}</label>
        <button className="btn-primary" type="submit">{t("owner.create")}</button>
      </form>
    </main>
  );
}
