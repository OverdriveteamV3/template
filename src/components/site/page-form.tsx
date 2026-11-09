"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/locale-provider";
import type { FormField } from "@/lib/forms/validate";
import { submitPageForm } from "@/server/booking-actions";

const fieldClass = "mt-1 w-full rounded-xl border border-[#e6e5df] bg-white px-3 py-2";

export function PageForm({ pageId, fields, databaseReady, preview = false }: { pageId: string; fields: FormField[]; databaseReady: boolean; preview?: boolean }) {
  const t = useT();
  const [message, setMessage] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  return (
    <form className="grid gap-3" action={async (formData) => {
      if (preview || !databaseReady) {
        setMessage(t("contact.previewStored"));
        return;
      }
      const result = await submitPageForm(formData);
      setMessage("ok" in result && result.ok ? t("contact.saved") : t("contact.failed"));
    }}>
      <input type="text" name="company_website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <input type="hidden" name="started_at" value={startedAt} />
      <input type="hidden" name="page" value={pageId} />
      {fields.map((field) => {
        if (field.type === "checkbox") {
          return <label key={field.id} className="flex items-center gap-2 text-sm"><input name={field.id} type="checkbox" required={field.required} />{field.label}</label>;
        }
        if (field.type === "select") {
          return <label key={field.id} className="block text-sm">{field.label}<select name={field.id} required={field.required} defaultValue="" className={fieldClass}><option value="" />{(field.options ?? []).map((option) => <option key={option}>{option}</option>)}</select></label>;
        }
        if (field.type === "long_text") {
          return <label key={field.id} className="block text-sm">{field.label}<textarea name={field.id} required={field.required} className={`${fieldClass} min-h-32`} rows={5} /></label>;
        }
        if (field.type === "image") {
          return <label key={field.id} className="block text-sm">{field.label}<input name={field.id} type="file" accept="image/jpeg,image/png,image/webp" required={field.required} className={fieldClass} /></label>;
        }
        const type = field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text";
        return <label key={field.id} className="block text-sm">{field.label}<input name={field.id} type={type} required={field.required} className={fieldClass} /></label>;
      })}
      {message ? <p role="status" className="text-sm">{message}</p> : null}
      <div className="flex justify-end pt-1">
        <button className="btn-primary !h-10 !w-auto !min-h-0 px-6 text-sm" type="submit">{t("common.send")}</button>
      </div>
    </form>
  );
}
