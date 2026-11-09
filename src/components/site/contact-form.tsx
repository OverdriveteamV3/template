"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/locale-provider";
import { submitContact } from "@/server/booking-actions";

const fieldClass = "mt-1 w-full rounded-xl border border-[#e6e5df] bg-white px-3 py-2";

export function ContactForm({ databaseReady }: { databaseReady: boolean }) {
  const t = useT();
  const [message, setMessage] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  return (
    <form className="flex h-full flex-1 flex-col gap-3" action={async (formData) => {
      if (!databaseReady) {
        setMessage(t("contact.previewStored"));
        return;
      }
      const result = await submitContact(formData);
      setMessage("ok" in result && result.ok ? t("contact.saved") : t("contact.failed"));
    }}>
      <input type="text" name="company_website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <input type="hidden" name="started_at" value={startedAt} />
      <label className="block text-sm">{t("common.name")}<input name="name" required className={fieldClass} /></label>
      <label className="block text-sm">{t("common.email")}<input name="email" type="email" required className={fieldClass} /></label>
      <label className="flex min-h-0 flex-1 flex-col text-sm">{t("common.message")}<textarea name="message" required className={`${fieldClass} min-h-32 flex-1`} rows={5} /></label>
      {message ? <p role="status" className="text-sm">{message}</p> : null}
      {!databaseReady && !message ? <p className="text-sm text-muted">{t("contact.preview")}</p> : null}
      <div className="mt-auto flex justify-end pt-1">
        <button className="btn-primary !h-10 !w-auto !min-h-0 px-6 text-sm" type="submit">{t("common.send")}</button>
      </div>
    </form>
  );
}
