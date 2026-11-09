"use client";

import { useT } from "@/components/i18n/locale-provider";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.9 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.1 26.8 36 24 36c-5.3 0-9.8-3.4-11.4-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.2-4.1 5.6l6.3 5.3C39.9 35.9 44 30.5 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

function SlackLogo() {
  return (
    <svg viewBox="0 0 127 127" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="#E01E5A" d="M27.2 80a13.2 13.2 0 1 1-13.2-13.2H27.2V80zm6.6 0a13.2 13.2 0 1 1 26.4 0v33a13.2 13.2 0 1 1-26.4 0V80z" />
      <path fill="#36C5F0" d="M47 27.2A13.2 13.2 0 1 1 60.2 14v13.2H47zm0 6.6a13.2 13.2 0 1 1 0 26.4H14a13.2 13.2 0 1 1 0-26.4h33z" />
      <path fill="#2EB67D" d="M99.8 47a13.2 13.2 0 1 1 13.2 13.2H99.8V47zm-6.6 0a13.2 13.2 0 1 1-26.4 0V14a13.2 13.2 0 1 1 26.4 0v33z" />
      <path fill="#ECB22E" d="M80 99.8a13.2 13.2 0 1 1-13.2 13.2V99.8H80zm0-6.6a13.2 13.2 0 1 1 0-26.4h33a13.2 13.2 0 1 1 0 26.4H80z" />
    </svg>
  );
}

const button = "flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white text-sm font-semibold";

export function ProviderButtons() {
  const t = useT();
  return (
    <div className="grid gap-2">
      <button type="button" className={button}>
        <GoogleLogo />
        {t("auth.google")}
      </button>
      <button type="button" className={button}>
        <SlackLogo />
        {t("auth.slack")}
      </button>
    </div>
  );
}
