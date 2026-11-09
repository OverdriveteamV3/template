"use client";

import { useActionState } from "react";
import { useT } from "@/components/i18n/locale-provider";
import { saveSupportForm } from "@/server/dashboard-actions";

export function SupportForm() {
  const t = useT();
  const [state, action, saving] = useActionState(saveSupportForm, null);
  return (
    <form action={action} className="grid max-w-xl gap-3 rounded-2xl border border-border bg-white p-4 text-sm">
      <p className="text-muted">{t("dash.supportNote")}</p>
      <label className="grid gap-1">{t("common.message")}<textarea name="message" required rows={5} className="w-full rounded-xl border border-border bg-white px-3 py-2" /></label>
      <div className="flex items-center justify-end gap-3">
        {state?.ok ? <p className="font-semibold">{t("dash.supportSent")}</p> : null}
        {state?.error ? <p role="alert" className="text-secondary">{state.error}</p> : null}
        <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary disabled:opacity-60">{t("common.send")}</button>
      </div>
    </form>
  );
}
