import { messages, type MessageKey } from "@/lib/i18n/messages";

export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];
export const LOCALE_COOKIE = "overdrive_locale";

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === "es" ? "es" : "en";
}

export function formatMessage(locale: Locale, key: MessageKey, vars?: Record<string, string | number>) {
  let text: string = messages[locale][key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

export function weekdays(locale: Locale) {
  return locale === "es" ? ["D", "L", "M", "X", "J", "V", "S"] : ["S", "M", "T", "W", "T", "F", "S"];
}

export function luxonLocale(locale: Locale) {
  return locale === "es" ? "es" : "en";
}
