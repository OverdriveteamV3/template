import { Suspense } from "react";
import Link from "next/link";
import { signOut } from "@/server/auth-actions";
import { LoadingLine } from "@/components/i18n/loading-line";
import { getLocale, translator } from "@/lib/i18n/server";
import { requireCustomer } from "@/server/guards";
import { createClient } from "@/lib/supabase/server";

export default function Page() {
  return <Suspense fallback={<LoadingLine label="account.loading" />}><Account /></Suspense>;
}

async function Account() {
  const t = await translator();
  const locale = await getLocale();
  const { viewer, site } = await requireCustomer();
  const supabase = site.databaseReady ? await createClient() : null;
  const appointments = supabase ? (await supabase.from("appointments").select("id, starts_at, status").eq("tenant_id", site.tenantId).order("starts_at", { ascending: false })).data ?? [] : [];
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-3xl font-semibold">{t("account.title")}</h1>
      <p className="mt-2 text-sm text-muted">{viewer?.email} · {site.name}</p>
      <ul className="mt-6 divide-y divide-border">
        {appointments.length === 0 ? <li className="py-4 text-sm text-muted">{t("account.empty")}</li> : appointments.map((item) => (
          <li key={item.id} className="flex justify-between py-3 text-sm"><Link href={`/account/appointments/${item.id}`}>{new Date(item.starts_at).toLocaleString(locale)}</Link><span>{item.status}</span></li>
        ))}
      </ul>
      <div className="mt-6 flex gap-4 text-sm"><Link href="/account/settings">{t("nav.profile")}</Link><form action={signOut}><button type="submit">{t("nav.signOut")}</button></form></div>
    </main>
  );
}
