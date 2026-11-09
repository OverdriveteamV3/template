"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PublicSite } from "@/lib/site/types";
import { useT } from "@/components/i18n/locale-provider";
import { confirmBooking } from "@/server/booking-actions";

export function ConfirmForm({ site, serviceId, staffId, startsAt }: { site: PublicSite; serviceId: string; staffId: string; startsAt: string }) {
  const t = useT();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const required = site.policies.filter((policy) => policy.requiredForBooking);
  if (!site.databaseReady) return <p className="mt-6 text-sm">{t("book.notLive")}</p>;
  return (
    <form className="mt-6 space-y-3" action={async (formData) => {
      const key = sessionStorage.getItem("od-booking-key") ?? crypto.randomUUID();
      sessionStorage.setItem("od-booking-key", key);
      formData.set("idempotencyKey", key);
      const result = await confirmBooking(formData);
      if (result && "error" in result && result.error === "slot_unavailable") {
        router.push(`/?service=${serviceId}&staff=${staffId}&start=&conflict=1`);
        return;
      }
      if (result && "error" in result && result.error === "not_configured") setMessage(result.message ?? t("book.notConfigured"));
      else if (result && "error" in result && result.error) setMessage(t("book.notConfirmed"));
    }}>
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="staffId" value={staffId} />
      <input type="hidden" name="startsAt" value={startsAt} />
      <label className="block text-sm">{t("common.name")}<input name="name" required className="mt-1 w-full rounded-xl border border-border px-3 py-2" /></label>
      <label className="block text-sm">{t("common.phone")}<input name="phone" className="mt-1 w-full rounded-xl border border-border px-3 py-2" /></label>
      <label className="block text-sm">{t("book.note")}<textarea name="note" className="mt-1 w-full rounded-xl border border-border px-3 py-2" rows={3} /></label>
      {required.map((policy) => (
        <label key={policy.versionId} className="flex gap-2 text-sm"><input type="checkbox" name="policy" value={policy.versionId} required /> {t("book.accept", { title: policy.title })}</label>
      ))}
      <button className="btn-primary" type="submit" disabled={!serviceId || !startsAt}>{t("book.confirm")}</button>
      {message ? <p role="alert">{message}</p> : null}
    </form>
  );
}
