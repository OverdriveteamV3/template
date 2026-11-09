import { SitePage } from "@/components/site/site-page";
import type { PublicSite } from "@/lib/site/types";
import type { Viewer } from "@/server/site";

export function PublicHome({ site, viewer, today }: { site: PublicSite; viewer: Viewer | null; today: string }) {
  return <SitePage site={site} viewer={viewer} today={today} />;
}
