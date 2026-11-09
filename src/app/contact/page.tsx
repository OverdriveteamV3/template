import { Suspense } from "react";
import Link from "next/link";
import { ContactForm } from "@/components/site/contact-form";
import { LoadingLine } from "@/components/i18n/loading-line";
import { translator } from "@/lib/i18n/server";
import { MaintenancePage } from "@/components/site/maintenance-page";
import { requireSite } from "@/server/guards";

export default function Page() {
  return <Suspense fallback={<LoadingLine label="contact.loading" />}><Contact /></Suspense>;
}

async function Contact() {
  const t = await translator();
  const { site } = await requireSite();
  if (site.maintenance) return <MaintenancePage name={site.name} category={site.category} logoUrl={site.logoUrl} />;
  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <Link href="/" className="text-sm">{t("nav.back")}</Link>
      <h1 className="mt-4 text-3xl font-semibold">{site.navLabels.contact || t("home.contact")}</h1>
      <p className="mt-2 text-sm text-muted">{site.contact.email} {site.contact.phone}</p>
      <div className="mt-6"><ContactForm databaseReady={site.databaseReady} fields={site.contactForm} /></div>
    </main>
  );
}
