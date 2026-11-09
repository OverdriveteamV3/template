import { Suspense } from "react";
import Link from "next/link";
import { LoadingLine } from "@/components/i18n/loading-line";
import { translator } from "@/lib/i18n/server";
import { MaintenancePage } from "@/components/site/maintenance-page";
import { requireSite } from "@/server/guards";

export default function Page() {
  return <Suspense fallback={<LoadingLine label="services.loading" />}><Services /></Suspense>;
}

async function Services() {
  const t = await translator();
  const { site } = await requireSite();
  if (site.maintenance) return <MaintenancePage name={site.name} category={site.category} logoUrl={site.logoUrl} />;
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <Link href="/" className="text-sm">{t("nav.back")}</Link>
      <h1 className="mt-4 text-3xl font-semibold">{site.navLabels.services || t("home.services")}</h1>
      <ul className="mt-6 divide-y divide-border">
        {site.services.map((service) => (
          <li key={service.id} className="py-4"><h2 className="font-semibold">{service.name}</h2><p className="text-sm text-muted">{service.description}</p><p className="text-sm">{service.durationMinutes} {t("common.minutes")}{service.showPrice && service.priceCents != null ? ` · $${(service.priceCents / 100).toFixed(0)}` : ""}</p></li>
        ))}
      </ul>
    </main>
  );
}
