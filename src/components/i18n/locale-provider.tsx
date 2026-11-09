"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { formatMessage, type Locale } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return (key: MessageKey, vars?: Record<string, string | number>) => formatMessage(locale, key, vars);
}
