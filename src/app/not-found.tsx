import Link from "next/link";
import { translator } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await translator();
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-semibold">{t("notFound.title")}</h1>
      <p className="mt-3 text-sm text-muted">{t("notFound.body")}</p>
      <Link href="/" className="mt-6 inline-block text-sm">{t("notFound.home")}</Link>
    </main>
  );
}
