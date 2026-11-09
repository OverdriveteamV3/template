import { Suspense } from "react";
import { notFound } from "next/navigation";
import { voidAction } from "@/lib/utils";
import { cancelMyAppointment } from "@/server/booking-actions";
import { LoadingLine } from "@/components/i18n/loading-line";
import { getLocale, translator } from "@/lib/i18n/server";
import { requireCustomer } from "@/server/guards";
import { createClient } from "@/lib/supabase/server";

export default function Page({ params }: { params: Promise<{ appointmentId: string }> }) {
  return <Suspense fallback={<LoadingLine label="account.loadingOne" />}><Detail params={params} /></Suspense>;
}

async function Detail({ params }: { params: Promise<{ appointmentId: string }> }) {
  const t = await translator();
  const locale = await getLocale();
  const { appointmentId } = await params;
  const { site } = await requireCustomer();
  if (!site.databaseReady) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("appointments").select("id, starts_at, ends_at, status, timezone, cancellation_cutoff_minutes").eq("id", appointmentId).eq("tenant_id", site.tenantId).maybeSingle();
  if (!data) notFound();
  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <h1 className="text-3xl font-semibold">{data.status}</h1>
      <p className="mt-3 text-sm">{new Date(data.starts_at).toLocaleString(locale)} · {data.timezone}</p>
      {data.status === "confirmed" ? (
        <form action={voidAction(cancelMyAppointment)} className="mt-6 space-y-3">
          <input type="hidden" name="appointmentId" value={data.id} />
          <label className="block text-sm">{t("account.reason")}<textarea name="reason" className="mt-1 w-full rounded-xl border border-border px-3 py-2" /></label>
          <button className="btn-primary" type="submit">{t("account.cancel")}</button>
          <p className="text-xs text-muted">{t("account.cutoff")}</p>
        </form>
      ) : null}
    </main>
  );
}
