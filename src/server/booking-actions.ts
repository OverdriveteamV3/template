"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { validateAnswers } from "@/lib/forms/validate";
import { createClient } from "@/lib/supabase/server";
import { getRequestContext } from "@/server/site";

export async function confirmBooking(formData: FormData) {
  const context = await getRequestContext();
  if (context.kind !== "site") return { error: "unknown_tenant" as const };
  if (!context.site.databaseReady) return { error: "not_configured" as const, message: "This preview cannot create a reservation. Connect Supabase to confirm appointments." };
  if (!context.viewer) return { error: "unauthenticated" as const };
  if (!context.viewer.emailConfirmed) return { error: "email_unconfirmed" as const };

  const serviceId = String(formData.get("serviceId") ?? "");
  const staffValue = String(formData.get("staffId") ?? "any");
  const startsAt = String(formData.get("startsAt") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const note = String(formData.get("note") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const name = String(formData.get("name") ?? context.viewer.email);
  const policies = formData.getAll("policy").map(String);
  const service = context.site.services.find((item) => item.id === serviceId);
  if (!service || !startsAt || !idempotencyKey) return { error: "invalid" as const };

  const required = context.site.policies.filter((policy) => policy.requiredForBooking).map((policy) => policy.versionId).sort();
  if (required.join() !== [...policies].sort().join()) return { error: "policy_version_mismatch" as const, required };

  const hash = createHash("sha256").update(JSON.stringify({ serviceId, staffValue, startsAt, note, phone, name, policies: required })).digest("hex");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("book_appointment", {
    p_tenant_id: context.site.tenantId,
    p_service_id: serviceId,
    p_staff_id: staffValue === "any" ? null : staffValue,
    p_starts_at: startsAt,
    p_idempotency_key: idempotencyKey,
    p_request_hash: hash,
    p_full_name: name,
    p_phone: phone,
    p_note: note,
    p_policy_version_ids: required,
    p_intake: { name, phone, note },
    p_form_version_id: null,
    p_on_behalf_customer_id: null,
  });
  if (error) return { error: "failed" as const, message: "The reservation could not be saved." };
  const body = data as { error?: string; appointmentId?: string; required?: string[] };
  if (body.error === "slot_unavailable") return { error: "slot_unavailable" as const };
  if (body.error) return { error: body.error, required: body.required };
  redirect(`/book/confirmation/${body.appointmentId}`);
}

export async function submitContact(formData: FormData) {
  const context = await getRequestContext();
  if (context.kind !== "site" || !context.site.databaseReady) return { error: "not_configured" as const };
  if (String(formData.get("company_website") ?? "")) return { ok: true as const };
  const started = Number(formData.get("started_at") ?? 0);
  if (!started || Date.now() - started < 2000) return { error: "slow_down" as const };
  const schema = { fields: [
    { id: "name", type: "short_text" as const, label: "Name", required: true },
    { id: "email", type: "email" as const, label: "Email", required: true },
    { id: "message", type: "long_text" as const, label: "Message", required: true },
  ] };
  const answers = { name: formData.get("name"), email: formData.get("email"), message: formData.get("message") };
  const parsed = validateAnswers(schema, answers);
  if (!parsed.ok) return { error: "invalid" as const, errors: parsed.errors };
  const supabase = await createClient();
  const { data: formVersionId } = await supabase.rpc("get_public_form", { p_slug: context.site.slug, p_kind: "contact" });
  if (!formVersionId) return { error: "no_form" as const };
  const { data, error } = await supabase.rpc("create_public_submission", {
    p_tenant_id: context.site.tenantId,
    p_form_version_id: formVersionId,
    p_answers: parsed.answers,
    p_email: String(parsed.answers.email ?? ""),
    p_ip_hash: "web",
  });
  if (error || (data as { error?: string })?.error) return { error: (data as { error?: string })?.error ?? "failed" };
  return { ok: true as const };
}

export async function cancelMyAppointment(formData: FormData) {
  const context = await getRequestContext();
  if (context.kind !== "site" || !context.viewer) return { error: "forbidden" as const };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_appointment", {
    p_appointment_id: String(formData.get("appointmentId")),
    p_reason: String(formData.get("reason") ?? ""),
  });
  if (error) return { error: "failed" as const };
  return data as { ok?: boolean; error?: string };
}

export async function rescheduleMyAppointment(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reschedule_appointment", {
    p_appointment_id: String(formData.get("appointmentId")),
    p_starts_at: String(formData.get("startsAt")),
    p_staff_id: String(formData.get("staffId") || "") || null,
  });
  if (error) return { error: "failed" as const };
  const body = data as { error?: string; ok?: boolean };
  if (body.error === "slot_unavailable") return { error: "slot_unavailable" as const };
  return body;
}
