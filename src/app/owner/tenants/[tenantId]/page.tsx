import { notFound } from "next/navigation";
import { translator } from "@/lib/i18n/server";
import { requirePlatformAdmin } from "@/server/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function Page({ params }: { params: Promise<{ tenantId: string }> }) {
  const t = await translator();
  await requirePlatformAdmin();
  const { tenantId } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select("id, name, slug, status, timezone, is_demo, is_template").eq("id", tenantId).maybeSingle();
  if (!data) notFound();
  const { data: domains } = await admin.from("tenant_domains").select("hostname, verification_status, kind").eq("tenant_id", data.id);
  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <h1 className="text-3xl font-semibold">{data.name}</h1>
      <p className="mt-2 text-sm">{data.status} · {data.timezone} · {data.slug}</p>
      <ul className="mt-4 text-sm">{(domains ?? []).map((domain) => <li key={domain.hostname}>{domain.hostname} · {domain.kind} · {domain.verification_status}</li>)}</ul>
      <p className="mt-4 text-xs text-muted">{t("owner.statusNote")}</p>
    </main>
  );
}
