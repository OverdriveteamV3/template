import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LoadingLine } from "@/components/i18n/loading-line";
import { getLocale, translator } from "@/lib/i18n/server";
import { requireCustomer } from "@/server/guards";
import { createClient } from "@/lib/supabase/server";

export default function Page({ params }: { params: Promise<{ appointmentId: string }> }) {
  return <Suspense fallback={<LoadingLine label="confirm.loading" />}><Confirmation params={params} /></Suspense>;
}

async function Confirmation({ params }: { params: Promise<{ appointmentId: string }> }) {
  const t = await translator();
  const locale = await getLocale();
  const { appointmentId } = await params;
  const { site } = await requireCustomer();
  const supabase = await createClient();
  const { data } = await supabase.from("appointments").select("id, starts_at, timezone, status").eq("id", appointmentId).eq("tenant_id", site.tenantId).maybeSingle();
  if (!data) notFound();
  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <p className="text-xs tracking-[0.16em] text-muted">{t("confirm.kicker")}</p>
      <h1 className="mt-2 text-3xl font-semibold">{t("confirm.title")}</h1>
      <p className="mt-3 text-sm">{new Date(data.starts_at).toLocaleString(locale)} · {data.timezone}</p>
      <p className="mt-3 text-sm text-muted">{t("confirm.body", { zone: data.timezone.replaceAll("_", " ") })}</p>
      <Link className="mt-6 inline-block text-sm" href={`/account/appointments/${data.id}`}>{t("confirm.view")}</Link>
    </main>
  );
}
