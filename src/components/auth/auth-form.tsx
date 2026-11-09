"use client";

import { useState } from "react";
import Link from "next/link";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { ProviderButtons } from "@/components/auth/provider-buttons";
import { useT } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function AuthForm({
  title,
  action,
  next,
  fields,
  submit,
  className,
  providers = false,
}: {
  title: string;
  action: (formData: FormData) => Promise<{ error?: string; ok?: boolean } | void>;
  next?: string;
  fields: Array<"name" | "login" | "email" | "password">;
  submit: string;
  className?: string;
  providers?: boolean;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const field = "mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-3";
  return (
    <form className={cn("mx-auto my-16 w-full max-w-[420px] rounded-[16px] border border-border bg-white p-8 shadow-[0_24px_60px_rgba(17,17,17,0.08)]", className)} action={async (formData) => {
      const result = await action(formData);
      if (result && "error" in result && result.error) setError(result.error);
    }}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-muted">{t("auth.portal")}</p>
        {providers ? <LanguageToggle /> : null}
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
      {providers ? (
        <>
          <div className="mt-6"><ProviderButtons /></div>
          <div className="mt-5 flex items-center gap-3 text-xs font-medium text-muted">
            <span className="h-px flex-1 bg-border" />
            {t("auth.or")}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}
      <div className={providers ? "mt-5 space-y-4" : "mt-6 space-y-4"}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {fields.includes("name") ? <label className="block text-sm font-medium">{t("common.name")}<input className={field} name="name" autoComplete="name" /></label> : null}
        {fields.includes("login") ? <label className="block text-sm font-medium">{t("auth.user")}<input className={field} name="email" type="text" autoComplete="username" required /></label> : null}
        {fields.includes("email") ? <label className="block text-sm font-medium">{t("common.email")}<input className={field} name="email" type="email" autoComplete="email" required /></label> : null}
        {fields.includes("password") ? (
          <label className="block text-sm font-medium">
            {t("common.password")}
            <span className="relative mt-1.5 block">
              <input className={`${field} mt-0 pr-11`} name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" minLength={8} required />
              <button type="button" className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center text-muted" aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </span>
          </label>
        ) : null}
        {fields.includes("login") ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2"><input name="remember" type="checkbox" className="h-4 w-4 accent-foreground" />{t("auth.remember")}</label>
            <Link href="/forgot-password" className="text-muted">{t("auth.forgotUser")}</Link>
          </div>
        ) : null}
        {error ? <p role="alert" className="text-sm text-secondary">{error}</p> : null}
        <button className="btn-primary mt-2" type="submit">{submit}</button>
      </div>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 3l18 18" />
      <path d="M10.5 10.7a2.5 2.5 0 0 0 3.3 3.3" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-3.2 4.2" />
      <path d="M6.1 6.7C3.7 8.3 2 12 2 12s3.5 6 10 6c1.2 0 2.3-.2 3.3-.6" />
    </svg>
  );
}
