import { z } from "zod";

export const fieldTypes = ["short_text", "long_text", "email", "phone", "select", "checkbox"] as const;
export type FieldType = (typeof fieldTypes)[number];

export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
};

export type FormSchema = { fields: FormField[] };

const fieldSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  type: z.enum(fieldTypes),
  label: z.string().trim().min(1).max(120),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
});

export const formSchema = z.object({ fields: z.array(fieldSchema).max(20) }).strict();

export function validateAnswers(schema: FormSchema, answers: Record<string, unknown>) {
  const clean: Record<string, string | boolean> = {};
  const errors: Record<string, string> = {};
  const known = new Set(schema.fields.map((field) => field.id));
  for (const key of Object.keys(answers)) {
    if (!known.has(key) && key !== "company_website") errors[key] = "Unknown field.";
  }
  for (const field of schema.fields) {
    const raw = answers[field.id];
    if (field.type === "checkbox") {
      const checked = raw === true || raw === "true" || raw === "on";
      if (field.required && !checked) errors[field.id] = "Required.";
      clean[field.id] = checked;
      continue;
    }
    const value = typeof raw === "string" ? raw.trim() : "";
    if (field.required && !value) errors[field.id] = "Required.";
    if (value && field.type === "email" && !z.email().safeParse(value).success) errors[field.id] = "Enter a valid email.";
    if (value && field.type === "phone" && !/^[0-9+().\-\s]{7,20}$/.test(value)) errors[field.id] = "Enter a valid phone number.";
    if (value && field.type === "select" && !field.options?.includes(value)) errors[field.id] = "Choose an option.";
    if (value.length > (field.type === "long_text" ? 2000 : 300)) errors[field.id] = "Too long.";
    clean[field.id] = value;
  }
  return { ok: Object.keys(errors).length === 0, answers: clean, errors };
}
