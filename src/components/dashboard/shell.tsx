import type { ReactNode } from "react";
import { DashboardAccount } from "@/components/dashboard/account-bar";
import { DashboardAside } from "@/components/dashboard/aside";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EditorHistoryButtons, EditorHistoryProvider } from "@/components/dashboard/editor-history";
import { DashboardNav } from "@/components/dashboard/nav";
import type { DashboardAlert } from "@/lib/dashboard/alert";
import { themeStyle, type ThemeTokens } from "@/lib/theme/tokens";

export function DashboardShell({ name, category, email, avatar, theme, alerts, children }: { name: string; category: string; email: string; avatar: string; theme: ThemeTokens; alerts: DashboardAlert[]; children: ReactNode }) {
  return (
    <EditorHistoryProvider>
    <div style={themeStyle(theme)} className="flex min-h-screen flex-col">
      <div className="mx-auto grid w-full max-w-[1280px] flex-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <DashboardAside>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-muted">{category.toUpperCase()}</p>
            <p className="mt-1 text-sm font-semibold">{name}</p>
          </div>
          <DashboardNav />
          <DashboardAccount email={email} avatar={avatar} />
          <EditorHistoryButtons />
        </DashboardAside>
        <div className="min-w-0">
          <DashboardHeader category={category} alerts={alerts} />
          <div data-dashboard-align>{children}</div>
        </div>
      </div>
    </div>
    </EditorHistoryProvider>
  );
}
