import { AuthForm } from "@/components/auth/auth-form";
import { translator } from "@/lib/i18n/server";
import { requestReset } from "@/server/auth-actions";

export default async function Page() {
  const t = await translator();
  return <main className="px-4"><AuthForm title={t("auth.reset")} action={requestReset} fields={["email"]} submit={t("auth.sendReset")} /></main>;
}
