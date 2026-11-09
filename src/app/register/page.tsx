import { Suspense } from "react";
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
  return <main className="px-4"><AuthForm title={t("auth.createAccount")} action={signUp} next={query.next} fields={["name", "email", "password"]} submit={t("auth.createAccount")} /></main>;
}
