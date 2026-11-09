import { connection } from "next/server";
import { Suspense } from "react";
import { DateTime } from "luxon";
import Link from "next/link";
import { ConfirmForm } from "@/components/booking/confirm-form";
import { LoadingLine } from "@/components/i18n/loading-line";
import { getLocale, translator } from "@/lib/i18n/server";
import { luxonLocale } from "@/lib/i18n/locale";
import { MaintenancePage } from "@/components/site/maintenance-page";
import { requireSite } from "@/server/guards";

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <Suspense fallback={<LoadingLine label="book.loading" />}><Book searchParams={searchParams} /></Suspense>;
}

async function Book({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await translator();
  const locale = await getLocale();
  const query = await searchParams;
  await connection();
  const { site, viewer } = await requireSite();
  if (site.maintenance) return <MaintenancePage name={site.name} category={site.category} logoUrl={site.logoUrl} />;
  const service = site.services.find((item) => item.id === query.service);
  const when = query.start ? DateTime.fromISO(query.start, { zone: "utc" }).setZone(site.timezone).setLocale(luxonLocale(locale)).toFormat("ccc, LLL d · h:mm a") : t("book.noTime");
  const returnTo = `/book?${new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString()}`;
  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <Link href={`/?${new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString()}`} className="text-sm">{t("book.back")}</Link>
      <h1 className="mt-4 text-3xl font-semibold">{t("book.review")}</h1>
      <p className="mt-3 text-sm">{service?.name ?? t("book.chooseService")} · {when}</p>
      <p className="text-xs text-muted">{t("book.notReservation", { zone: site.timezone.replaceAll("_", " ") })}</p>
      {!viewer ? <p className="mt-6 text-sm"><Link href={`/sign-in?next=${encodeURIComponent(returnTo)}`}>{t("book.signInReserve")}</Link> {t("book.orCreate")} <Link href={`/register?next=${encodeURIComponent(returnTo)}`}>{t("book.createToReserve")}</Link> {t("book.reserveRest")}</p> : null}
      {viewer && !viewer.emailConfirmed ? <p className="mt-6 text-sm">{t("book.verify")}</p> : null}
      {viewer?.emailConfirmed ? <ConfirmForm site={site} serviceId={service?.id ?? ""} staffId={query.staff ?? "any"} startsAt={query.start ?? ""} /> : null}
    </main>
  );
}
