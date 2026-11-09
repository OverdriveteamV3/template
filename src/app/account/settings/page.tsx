import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { updateProfile } from "@/server/auth-actions";
import { LoadingLine } from "@/components/i18n/loading-line";
import { translator } from "@/lib/i18n/server";
import { requireCustomer } from "@/server/guards";

export default function Page() {
  return <Suspense fallback={<LoadingLine label="auth.loadingSettings" />}><Settings /></Suspense>;
}

async function Settings() {
  const t = await translator();
  await requireCustomer();
  return <main className="px-4"><AuthForm title={t("auth.profile")} action={updateProfile} fields={["name"]} submit={t("auth.saveProfile")} /></main>;
}
