import { notFound } from "next/navigation";
import { getLocale } from "@/lib/i18n/server";
import { requireMember } from "@/server/guards";
import { createClient } from "@/lib/supabase/server";

export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const locale = await getLocale();
  const { customerId } = await params;
  const { site } = await requireMember();
  const supabase = await createClient();
  const { data } = await supabase.from("tenant_customers").select("id, full_name, email, phone").eq("id", customerId).eq("tenant_id", site.tenantId).maybeSingle();
  if (!data) notFound();
  const { data: appointments } = await supabase.from("appointments").select("id, starts_at, status").eq("customer_id", data.id).eq("tenant_id", site.tenantId);
  return <section><h1 className="text-3xl font-semibold">{data.full_name}</h1><p className="text-sm">{data.email} {data.phone}</p><ul className="mt-4 text-sm">{(appointments ?? []).map((item) => <li key={item.id}>{new Date(item.starts_at).toLocaleString(locale)} · {item.status}</li>)}</ul></section>;
}
