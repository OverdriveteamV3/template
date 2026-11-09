import type { ReactNode } from "react";
import { DashboardAside } from "@/components/dashboard/aside";
import { DashboardLanguage } from "@/components/dashboard/dashboard-language";
import { DashboardNav } from "@/components/dashboard/nav";
import { PoweredBy } from "@/components/site/powered-by";
import { themeStyle, type ThemeTokens } from "@/lib/theme/tokens";

export function DashboardShell({ name, category, theme, children }: { name: string; category: string; theme: ThemeTokens; children: ReactNode }) {
  return (
    <div style={themeStyle(theme)} className="flex min-h-screen flex-col">
      <div className="mx-auto grid w-full max-w-[1280px] flex-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <DashboardAside>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-muted">{category.toUpperCase()}</p>
            <p className="mt-1 text-sm font-semibold">{name}</p>
          </div>
          <DashboardNav />
        </DashboardAside>
        <div className="min-w-0">
          <DashboardLanguage />
          {children}
        </div>
      </div>
      <div className="px-4 pb-6">
        <PoweredBy />
      </div>
    </div>
  );
}
