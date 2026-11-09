import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/dashboard/account-settings";
import { LoadingLine } from "@/components/i18n/loading-line";
import { loadAccountProfile } from "@/server/account-profile";
import { requireCustomer } from "@/server/guards";

export default function Page() {
  return <Suspense fallback={<LoadingLine label="auth.loadingSettings" />}><Settings /></Suspense>;
}

async function Settings() {
  const { viewer } = await requireCustomer();
  if (!viewer) redirect("/sign-in?next=/account");
  if (viewer.role) redirect("/dashboard/settings");
  const profile = await loadAccountProfile(viewer);
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <AccountSettings {...profile} />
    </main>
  );
}
