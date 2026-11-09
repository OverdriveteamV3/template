import { DateTime } from "luxon";
import { connection } from "next/server";
import { Suspense } from "react";
import { PublicHome } from "@/components/site/public-home";
import { PlatformHome } from "@/components/site/platform-home";
import { LoadingLine } from "@/components/i18n/loading-line";
import { translator } from "@/lib/i18n/server";
import { getRequestContext } from "@/server/site";

export default function Page() {
  return (
    <Suspense fallback={<LoadingLine label="home.loading" />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const t = await translator();
  const context = await getRequestContext();
  if (context.kind === "platform") return <PlatformHome viewer={context.viewer} />;
  if (context.kind === "unknown") return <p className="p-8">{t("home.unknown")}</p>;
  await connection();
  const today = DateTime.now().setZone(context.site.timezone).toISODate() ?? "";
  return <PublicHome site={context.site} viewer={context.viewer} today={today} />;
}
