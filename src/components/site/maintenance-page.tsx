"use client";

import { useT } from "@/components/i18n/locale-provider";

export function MaintenancePage({ name, category, logoUrl, compact = false }: { name: string; category: string; logoUrl: string; compact?: boolean }) {
  const t = useT();
  return (
    <main className={`grid place-items-center bg-[#f6f3ec] px-6 text-center text-foreground ${compact ? "min-h-[420px] py-10" : "min-h-screen py-16"}`}>
      <div className="max-w-md">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="mx-auto h-16 max-w-[14rem] object-contain" />
        ) : (
          <p className="text-xs font-semibold tracking-[0.18em] text-muted">{category.toUpperCase()}</p>
        )}
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">{t("home.maintenance")}</h1>
        <p className="mt-3 text-sm text-muted">{t("home.maintenanceNote", { name })}</p>
      </div>
    </main>
  );
}
