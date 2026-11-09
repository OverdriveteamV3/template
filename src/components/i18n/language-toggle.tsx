"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/locale";
import { useLocale, useT } from "@/components/i18n/locale-provider";

export function LanguageToggle() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();

  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }

  const option = (value: Locale, short: string, label: string) => (
    <button type="button" aria-pressed={locale === value} aria-label={label} className={`rounded-full px-2.5 py-1 ${locale === value ? "bg-primary text-on-primary" : "text-muted"}`} onClick={() => choose(value)}>
      {short}
    </button>
  );

  return (
    <div className="flex items-center rounded-full border border-border p-0.5 text-xs font-semibold" role="group" aria-label={t("lang.group")}>
      {option("en", "EN", t("lang.english"))}
      {option("es", "ES", t("lang.spanish"))}
    </div>
  );
}
