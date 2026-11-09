import { z } from "zod";

export const fieldTypes = ["short_text", "long_text", "image", "email", "phone", "number", "date", "select", "checkbox"] as const;
export type FieldType = (typeof fieldTypes)[number];

export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
};

export type FormSchema = { fields: FormField[] };

export const defaultContactFields: FormField[] = [
  { id: "name", type: "short_text", label: "Name", required: true },
  { id: "email", type: "email", label: "Email", required: true },
  { id: "message", type: "long_text", label: "Message", required: true },
];

export const formStarters = ["contact", "quote", "survey", "blank"] as const;
export type FormStarter = (typeof formStarters)[number];

export function starterFields(starter: FormStarter): FormField[] {
  if (starter === "contact") return [
    { id: "name", type: "short_text", label: "Name", required: true },
    { id: "email", type: "email", label: "Email", required: true },
    { id: "phone", type: "phone", label: "Phone", required: false },
    { id: "message", type: "long_text", label: "Message", required: true },
  ];
  if (starter === "quote") return [
    { id: "name", type: "short_text", label: "Name", required: true },
    { id: "email", type: "email", label: "Email", required: true },
    { id: "phone", type: "phone", label: "Phone", required: false },
    { id: "service", type: "select", label: "What do you need", required: true, options: ["Cut", "Color", "Other"] },
    { id: "budget", type: "number", label: "Budget", required: false },
    { id: "details", type: "long_text", label: "Project details", required: true },
    { id: "photo", type: "image", label: "Reference photo", required: false },
  ];
  if (starter === "survey") return [
    { id: "name", type: "short_text", label: "Name", required: false },
    { id: "email", type: "email", label: "Email", required: false },
    { id: "visit", type: "date", label: "Visit date", required: false },
    { id: "rating", type: "select", label: "Rating", required: true, options: ["5", "4", "3", "2", "1"] },
    { id: "went_well", type: "long_text", label: "What went well", required: false },
    { id: "change", type: "long_text", label: "What should change", required: false },
    { id: "recommend", type: "checkbox", label: "I would recommend you", required: false },
  ];
  return [{ id: "answer", type: "short_text", label: "Your answer", required: false }];
}

export const fieldSchema = z.object({
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
    if (field.type === "image") {
      const value = typeof raw === "string" ? raw.trim() : "";
      if (field.required && !value) errors[field.id] = "Required.";
      if (value.length > 500) errors[field.id] = "Too long.";
      clean[field.id] = value;
      continue;
    }
    const value = typeof raw === "string" ? raw.trim() : "";
    if (field.required && !value) errors[field.id] = "Required.";
    if (value && field.type === "email" && !z.email().safeParse(value).success) errors[field.id] = "Enter a valid email.";
    if (value && field.type === "phone" && !/^[0-9+().\-\s]{7,20}$/.test(value)) errors[field.id] = "Enter a valid phone number.";
    if (value && field.type === "number" && !/^\d{1,8}(\.\d{1,2})?$/.test(value)) errors[field.id] = "Enter a number.";
    if (value && field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors[field.id] = "Enter a date.";
    if (value && field.type === "select" && !field.options?.includes(value)) errors[field.id] = "Choose an option.";
    if (value.length > (field.type === "long_text" ? 2000 : 300)) errors[field.id] = "Too long.";
    clean[field.id] = value;
  }
  return { ok: Object.keys(errors).length === 0, answers: clean, errors };
}
