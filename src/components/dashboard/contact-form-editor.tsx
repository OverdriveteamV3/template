"use client";

import { useActionState } from "react";
import { useT } from "@/components/i18n/locale-provider";
import { type FieldType, type FormField, fieldTypes } from "@/lib/forms/validate";
import { saveContactFormFields } from "@/server/dashboard-actions";

const fieldClass = "w-full rounded-xl border border-border bg-white px-3 py-2";
const typeLabel = {
  short_text: "dash.shortText",
  long_text: "dash.longText",
  image: "dash.imageField",
  email: "common.email",
  phone: "common.phone",
  number: "dash.numberField",
  date: "dash.dateField",
  select: "dash.selectField",
  checkbox: "dash.checkboxField",
} as const;

export function ContactFormEditor({ fields, onChange }: { fields: FormField[]; onChange: (fields: FormField[]) => void }) {
  const t = useT();
  const [state, action, saving] = useActionState(saveContactFormFields, null);

  function update(id: string, partial: Partial<FormField>) {
    onChange(fields.map((field) => field.id === id ? { ...field, ...partial } : field));
  }

  function add() {
    const id = `field_${Math.random().toString(36).slice(2, 10)}`;
    onChange([...fields, { id, type: "short_text", label: "", required: false }]);
  }

  function save() {
    const data = new FormData();
    data.set("fields", JSON.stringify(fields.map((field) => ({
      ...field,
      label: field.label.trim(),
      options: field.type === "select" ? field.options?.map((option) => option.trim()).filter(Boolean) : undefined,
    }))));
    action(data);
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{t("dash.forms")}</p>
        <button type="button" onClick={add} className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold">{t("dash.addField")}</button>
      </div>
      <ul className="grid gap-3">
        {fields.map((field) => (
          <li key={field.id} className="grid gap-2 rounded-xl border border-border p-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
              <label className="grid gap-1 text-xs">{t("dash.fieldLabel")}<input value={field.label} onChange={(event) => update(field.id, { label: event.target.value })} className={fieldClass} /></label>
              <label className="grid gap-1 text-xs">{t("dash.fieldType")}
                <select value={field.type} onChange={(event) => update(field.id, { type: event.target.value as FieldType, options: event.target.value === "select" ? field.options ?? [] : undefined })} className={fieldClass}>
                  {fieldTypes.map((type) => <option key={type} value={type}>{t(typeLabel[type])}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => fields.length > 1 && onChange(fields.filter((item) => item.id !== field.id))} disabled={fields.length < 2} className="self-end rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40">{t("dash.removeButton")}</button>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input type="checkbox" checked={field.required} onChange={(event) => update(field.id, { required: event.target.checked })} />
              {t("dash.required")}
            </label>
            {field.type === "select" ? (
              <label className="grid gap-1 text-xs">{t("dash.fieldOptions")}<input value={(field.options ?? []).join(",")} onChange={(event) => update(field.id, { options: event.target.value.split(",") })} className={fieldClass} /></label>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-end gap-3">
        {state?.ok ? <p className="text-sm font-semibold">{t("dash.saved")}</p> : null}
        {state?.error ? <p role="alert" className="text-sm text-secondary">{state.error}</p> : null}
        <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60">{t("common.save")}</button>
      </div>
    </div>
  );
}
