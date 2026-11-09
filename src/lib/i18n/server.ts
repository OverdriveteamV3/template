import { cookies } from "next/headers";
import { formatMessage, normalizeLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return normalizeLocale(jar.get(LOCALE_COOKIE)?.value);
}

export async function translator() {
  const locale = await getLocale();
  return (key: MessageKey, vars?: Record<string, string | number>) => formatMessage(locale, key, vars);
}
