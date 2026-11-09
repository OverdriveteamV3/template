import { AuthForm } from "@/components/auth/auth-form";
import { translator } from "@/lib/i18n/server";
import { updatePassword } from "@/server/auth-actions";

export default async function Page() {
  const t = await translator();
  return <main className="px-4"><AuthForm title={t("auth.newPassword")} action={updatePassword} fields={["password"]} submit={t("auth.updatePassword")} /></main>;
}
