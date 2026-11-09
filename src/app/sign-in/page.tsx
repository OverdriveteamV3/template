import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { LoadingLine } from "@/components/i18n/loading-line";
import { translator } from "@/lib/i18n/server";
import { signIn } from "@/server/auth-actions";

export default function Page({ searchParams }: { searchParams: Promise<{ next?: string; notice?: string }> }) {
  return <Suspense fallback={<LoadingLine label="auth.loadingSignIn" />}><SignIn searchParams={searchParams} /></Suspense>;
}

async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; notice?: string }> }) {
  const t = await translator();
  const query = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4 py-16">
      <div className="w-full max-w-[420px]">
        {query.notice === "check-email" ? <p className="mb-4 text-center text-sm text-muted">{t("auth.checkEmail")}</p> : null}
        <Link href="/" className="mb-6 ml-4 inline-flex items-center gap-2 text-sm text-muted">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M19 12H5" />
            <path d="M11 6l-6 6 6 6" />
          </svg>
          {t("auth.backWebsite")}
        </Link>
        <AuthForm className="my-0" title={t("auth.signIn")} action={signIn} next={query.next} fields={["login", "password"]} submit={t("auth.signIn")} providers />
        <p className="mt-5 text-center text-sm text-muted"><Link href={`/register?next=${encodeURIComponent(query.next ?? "/")}`} className="text-foreground">{t("auth.create")}</Link></p>
      </div>
    </main>
  );
}
