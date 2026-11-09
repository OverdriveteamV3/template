"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/locale-provider";
import { defaultContactFields, type FormField } from "@/lib/forms/validate";
import { submitContact } from "@/server/booking-actions";

const fieldClass = "mt-1 w-full rounded-xl border border-[#e6e5df] bg-white px-3 py-2";

function labelFor(field: FormField, t: (key: "common.name" | "common.email" | "common.message") => string) {
  if (field.id === "name" && field.label === "Name") return t("common.name");
  if (field.id === "email" && field.label === "Email") return t("common.email");
  if (field.id === "message" && field.label === "Message") return t("common.message");
  return field.label;
}

export function ContactForm({ databaseReady, fields = defaultContactFields }: { databaseReady: boolean; fields?: FormField[] }) {
  const t = useT();
  const [message, setMessage] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const list = fields.length ? fields : defaultContactFields;
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
      {list.map((field) => {
        const label = labelFor(field, t);
        if (field.type === "checkbox") {
          return <label key={field.id} className="flex items-center gap-2 text-sm"><input name={field.id} type="checkbox" required={field.required} />{label}</label>;
        }
        if (field.type === "select") {
          return <label key={field.id} className="block text-sm">{label}<select name={field.id} required={field.required} defaultValue="" className={fieldClass}><option value="" />{(field.options ?? []).map((option) => <option key={option}>{option}</option>)}</select></label>;
        }
        if (field.type === "long_text") {
          return <label key={field.id} className="flex min-h-0 flex-1 flex-col text-sm">{label}<textarea name={field.id} required={field.required} className={`${fieldClass} min-h-32 flex-1`} rows={5} /></label>;
        }
        if (field.type === "image") {
          return <label key={field.id} className="block text-sm">{label}<input name={field.id} type="file" accept="image/jpeg,image/png,image/webp" required={field.required} className={fieldClass} /></label>;
        }
        const type = field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text";
        return <label key={field.id} className="block text-sm">{label}<input name={field.id} type={type} required={field.required} className={fieldClass} /></label>;
      })}
      {message ? <p role="status" className="text-sm">{message}</p> : null}
      {!databaseReady && !message ? <p className="text-sm text-muted">{t("contact.preview")}</p> : null}
      <div className="mt-auto flex justify-end pt-1">
        <button className="btn-primary !h-10 !w-auto !min-h-0 px-6 text-sm" type="submit">{t("common.send")}</button>
      </div>
    </form>
  );
}
