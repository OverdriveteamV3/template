import { Suspense, type ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/shell";
import { LoadingLine } from "@/components/i18n/loading-line";
import { requireMember } from "@/server/guards";

export const instant = false;

export default function Layout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingLine label="dash.loading" />}><Frame>{children}</Frame></Suspense>;
}

async function Frame({ children }: { children: ReactNode }) {
  const { site } = await requireMember();
  return <DashboardShell name={site.name} category={site.category} theme={site.theme}>{children}</DashboardShell>;
}
