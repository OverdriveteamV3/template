import { CustomerBoard } from "@/components/dashboard/section-boards";
import Link from "next/link";
import { translator } from "@/lib/i18n/server";
import { requireMember } from "@/server/guards";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const t = await translator();
  const { site } = await requireMember();
  if (!site.databaseReady) return <CustomerBoard site={site} t={t} />;
  const supabase = await createClient();
  const { data } = await supabase.from("tenant_customers").select("id, full_name, email").eq("tenant_id", site.tenantId).order("created_at", { ascending: false });
  return (
    <section>
      <ul className="divide-y divide-border text-sm">{(data ?? []).length === 0 ? <li className="py-3 text-muted">{t("dash.noCustomers")}</li> : data?.map((person) => <li key={person.id} className="py-2"><Link href={`/dashboard/customers/${person.id}`}>{person.full_name}</Link> · {person.email}</li>)}</ul>
    </section>
  );
}
