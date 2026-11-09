import { Suspense } from "react";
import { AccountSettings } from "@/components/dashboard/account-settings";
import { LoadingLine } from "@/components/i18n/loading-line";
import { loadAccountProfile } from "@/server/account-profile";
import { requireMember } from "@/server/guards";

export default function Page() {
  return <Suspense fallback={<LoadingLine label="auth.loadingSettings" />}><Settings /></Suspense>;
}

async function Settings() {
  const { viewer } = await requireMember();
  const profile = await loadAccountProfile(viewer);
  return <AccountSettings {...profile} />;
}
