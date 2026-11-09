import Link from "next/link";
import { PoweredBy } from "@/components/site/powered-by";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { translator } from "@/lib/i18n/server";
import type { Viewer } from "@/server/site";

export async function PlatformHome({ viewer }: { viewer: Viewer | null }) {
  const t = await translator();
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-between px-6 py-10">
      <div>
        <div className="flex items-center justify-between"><p className="text-xs tracking-[0.16em] text-muted">OVER DRIVE</p><LanguageToggle /></div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t("platform.title")}</h1>
        <p className="mt-4 max-w-xl text-muted">{t("platform.body")}</p>
        <div className="mt-6 flex gap-3 text-sm">
          {viewer?.isPlatformAdmin ? <Link className="btn-primary w-auto px-4" href="/owner">{t("platform.businesses")}</Link> : <Link className="btn-primary w-auto px-4" href="/sign-in?next=/owner">{t("platform.ownerSignIn")}</Link>}
        </div>
      </div>
      <PoweredBy />
    </main>
  );
}
