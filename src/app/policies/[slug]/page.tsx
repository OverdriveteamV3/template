import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoadingLine } from "@/components/i18n/loading-line";
import { translator } from "@/lib/i18n/server";
import { MaintenancePage } from "@/components/site/maintenance-page";
import { requireSite } from "@/server/guards";

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense fallback={<LoadingLine label="policy.loading" />}><Policy params={params} /></Suspense>;
}

async function Policy({ params }: { params: Promise<{ slug: string }> }) {
  const t = await translator();
  const { slug } = await params;
  const { site } = await requireSite();
  if (site.maintenance) return <MaintenancePage name={site.name} category={site.category} logoUrl={site.logoUrl} />;
  const policy = site.policies.find((item) => item.slug === slug);
  if (!policy) notFound();
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-3xl font-semibold">{policy.title}</h1>
      <p className="mt-2 text-xs text-muted">{t("policy.effective", { when: policy.effectiveOn ?? t("policy.whenPublished") })}</p>
      <article className="mt-6 whitespace-pre-wrap text-sm">{policy.body}</article>
    </main>
  );
}
