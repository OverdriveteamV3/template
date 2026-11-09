"use client";

import { useT } from "@/components/i18n/locale-provider";

export function LoadingScreen() {
  const t = useT();
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#f6f3ec]">
      <div className="flex flex-col items-center px-6">
        <img src="/overdrive.webp" alt="Over Drive" className="overdrive-logo w-[min(62vw,240px)]" />
        <p className="mt-2 text-sm font-semibold tracking-[0.28em] text-foreground">
          {t("common.loadingMark")}
          <span className="overdrive-dot" style={{ animationDelay: "0s" }}>.</span>
          <span className="overdrive-dot" style={{ animationDelay: "0.2s" }}>.</span>
          <span className="overdrive-dot" style={{ animationDelay: "0.4s" }}>.</span>
        </p>
      </div>
    </div>
  );
}
