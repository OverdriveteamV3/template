import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { LoadingLine } from "@/components/i18n/loading-line";
import { translator } from "@/lib/i18n/server";
import { signUp } from "@/server/auth-actions";

export default function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <Suspense fallback={<LoadingLine label="auth.loadingRegister" />}><Register searchParams={searchParams} /></Suspense>;
}

async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const t = await translator();
  const query = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4 py-16">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="mb-6 ml-4 inline-flex items-center gap-2 text-sm text-muted">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M19 12H5" />
            <path d="M11 6l-6 6 6 6" />
          </svg>
          {t("auth.backWebsite")}
        </Link>
        <AuthForm className="my-0" title={t("auth.create")} action={signUp} next={query.next} fields={["name", "email", "phone", "password"]} submit={t("auth.createAccount")} providers note={t("auth.onboarding")} />
        <p className="mt-5 text-center"><Link href={`/sign-in?next=${encodeURIComponent(query.next ?? "/")}`} className="inline-flex h-9 items-center rounded-xl border border-border bg-white px-4 text-sm font-medium text-foreground">{t("auth.signIn")}</Link></p>
      </div>
    </main>
  );
}
