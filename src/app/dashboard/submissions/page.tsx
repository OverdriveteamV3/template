import { SubmissionBoard } from "@/components/dashboard/section-boards";
import Link from "next/link";
import { translator } from "@/lib/i18n/server";
import { MASTER_USER_ID } from "@/lib/auth/master";
import { requireMember } from "@/server/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const t = await translator();
  const { site, viewer } = await requireMember();
  if (!site.databaseReady) return <SubmissionBoard t={t} />;
  const supabase = viewer.id === MASTER_USER_ID ? createAdminClient() : await createClient();
  const { data } = await supabase.from("submissions").select("id, kind, status, created_at, customer_email").eq("tenant_id", site.tenantId).order("created_at", { ascending: false });
  return <section><ul className="divide-y divide-border text-sm">{(data ?? []).length === 0 ? <li className="py-3 text-muted">{t("dash.noMessages")}</li> : data?.map((item) => <li key={item.id} className="py-2"><Link href={`/dashboard/submissions/${item.id}`}>{item.kind} · {item.status}</Link> · {item.customer_email}</li>)}</ul></section>;
}
