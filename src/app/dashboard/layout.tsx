import { Suspense, type ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/shell";
import { LoadingLine } from "@/components/i18n/loading-line";
import { readAccountAvatar } from "@/lib/auth/avatar";
import { loadAlerts } from "@/server/alerts";
import { requireMember } from "@/server/guards";

export const instant = false;

export default function Layout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingLine label="dash.loading" />}><Frame>{children}</Frame></Suspense>;
}

async function Frame({ children }: { children: ReactNode }) {
  const { site, viewer } = await requireMember();
  const alerts = await loadAlerts(site, viewer);
  const avatar = await readAccountAvatar(viewer.id);
  return <DashboardShell name={site.name} category={site.category} email={viewer.email} avatar={avatar} theme={site.theme} alerts={alerts}>{children}</DashboardShell>;
}
