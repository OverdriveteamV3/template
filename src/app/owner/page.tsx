import Link from "next/link";
import { translator } from "@/lib/i18n/server";
import { requirePlatformAdmin } from "@/server/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function Page() {
  const t = await translator();
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select("id, name, slug, status, is_demo").order("created_at", { ascending: false });
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-semibold">{t("owner.businesses")}</h1><Link href="/owner/new">{t("owner.new")}</Link></div>
      <ul className="mt-6 divide-y divide-border text-sm">{(data ?? []).map((tenant) => <li key={tenant.id} className="py-3"><Link href={`/owner/tenants/${tenant.id}`}>{tenant.name}</Link> · {tenant.slug} · {tenant.status}{tenant.is_demo ? ` · ${t("owner.sample")}` : ""}</li>)}</ul>
    </main>
  );
}
