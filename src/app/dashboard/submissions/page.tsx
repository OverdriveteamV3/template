import { SubmissionBoard } from "@/components/dashboard/section-boards";
import Link from "next/link";
import { translator } from "@/lib/i18n/server";
import { requireMember } from "@/server/guards";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const t = await translator();
  const { site } = await requireMember();
  if (!site.databaseReady) return <SubmissionBoard t={t} />;
  const supabase = await createClient();
  const { data } = await supabase.from("submissions").select("id, kind, status, created_at, customer_email").eq("tenant_id", site.tenantId).order("created_at", { ascending: false });
  return <section><h1 className="text-3xl font-semibold">{t("dash.submissions")}</h1><ul className="mt-4 divide-y divide-border text-sm">{(data ?? []).length === 0 ? <li className="py-3 text-muted">{t("dash.noMessages")}</li> : data?.map((item) => <li key={item.id} className="py-2"><Link href={`/dashboard/submissions/${item.id}`}>{item.kind} · {item.status}</Link> · {item.customer_email}</li>)}</ul></section>;
}
