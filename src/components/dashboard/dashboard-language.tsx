"use client";

import { usePathname } from "next/navigation";
import { LanguageToggle } from "@/components/i18n/language-toggle";

export function DashboardLanguage() {
  const pathname = usePathname();
  if (pathname === "/dashboard") return null;
  return (
    <div className="mb-4 flex justify-end">
      <LanguageToggle />
    </div>
  );
}
