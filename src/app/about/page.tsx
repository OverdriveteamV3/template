import { Suspense } from "react";
import Link from "next/link";
import { LoadingLine } from "@/components/i18n/loading-line";
import { translator } from "@/lib/i18n/server";
import { requireSite } from "@/server/guards";

export default function Page() {
  return <Suspense fallback={<LoadingLine />}><About /></Suspense>;
}

async function About() {
  const t = await translator();
  const { site } = await requireSite();
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <Link href="/" className="text-sm">{t("nav.back")}</Link>
      <h1 className="mt-4 text-3xl font-semibold">{t("home.about")} {site.name}</h1>
      {site.about.visible ? <div className="mt-4 space-y-3 text-sm"><p>{site.about.short}</p><p>{site.about.body}</p><p>{site.about.companyBio}</p><p>{site.about.professionalBio}</p></div> : <p className="mt-4 text-sm text-muted">{t("home.hidden")}</p>}
    </main>
  );
}
