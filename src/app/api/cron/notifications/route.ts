import { DateTime } from "luxon";
import { Resend } from "resend";
import { buildIcs } from "@/lib/email/ics";
import { escapeHtml, safeHeader } from "@/lib/email/escape";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const admin = createAdminClient();
  const { data: rows, error } = await admin.rpc("claim_outbox", { p_limit: 20 });
  if (error) return Response.json({ error: "claim_failed" }, { status: 500 });
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  for (const row of rows ?? []) {
    try {
      if (!resendKey || !from) throw new Error("Email provider is not configured.");
      const message = await renderMessage(admin, row);
      const resend = new Resend(resendKey);
      const sent = await resend.emails.send({
        from: safeHeader(message.from),
        to: message.to,
        replyTo: message.replyTo,
        subject: safeHeader(message.subject),
        html: message.html,
        text: message.text,
        attachments: message.ics ? [{ filename: "appointment.ics", content: message.ics }] : undefined,
      }, { idempotencyKey: row.id });
      if (sent.error) throw new Error(sent.error.message);
      await admin.from("notification_outbox").update({ status: "sent", provider_message_id: sent.data?.id ?? null, last_error: null }).eq("id", row.id);
    } catch (caught) {
      const attempts = row.attempts ?? 1;
      await admin.from("notification_outbox").update({
        status: attempts >= 8 ? "dead" : "failed",
        last_error: caught instanceof Error ? caught.message : "send_failed",
        next_attempt_at: new Date(Date.now() + attempts * 2 * 60 * 1000).toISOString(),
      }).eq("id", row.id);
    }
  }
  return Response.json({ processed: (rows ?? []).length });
}

async function renderMessage(admin: ReturnType<typeof createAdminClient>, row: { id: string; tenant_id: string; event_type: string; payload: { appointmentId?: string; submissionId?: string } }) {
  const { data: settings } = await admin.from("notification_settings").select("reply_to, recipients, public_contact_email, sender_mode, verified_from_address").eq("tenant_id", row.tenant_id).maybeSingle();
  const { data: tenant } = await admin.from("tenants").select("name, timezone").eq("id", row.tenant_id).single();
  const fromAddress = settings?.sender_mode === "verified_domain" && settings.verified_from_address ? settings.verified_from_address : process.env.EMAIL_FROM;
  const from = `${safeHeader(tenant?.name ?? "Over Drive")} <${fromAddress}>`;
  if (row.payload.submissionId) {
    const { data: submission } = await admin.from("submissions").select("answers, customer_email").eq("id", row.payload.submissionId).maybeSingle();
    const answers = Object.entries((submission?.answers ?? {}) as Record<string, unknown>).map(([key, value]) => `${escapeHtml(key)}: ${escapeHtml(String(value))}`).join("<br>");
    return { from, to: settings?.recipients ?? [], replyTo: settings?.reply_to ?? undefined, subject: `New message for ${tenant?.name ?? "a business"}`, html: answers, text: answers.replaceAll("<br>", "\n"), ics: null };
  }
  const { data: appointment } = await admin.from("appointments").select("id, starts_at, ends_at, timezone, status").eq("id", row.payload.appointmentId).maybeSingle();
  const { data: customer } = appointment ? await admin.from("appointments").select("customer_id").eq("id", appointment.id).maybeSingle() : { data: null };
  void customer;
  const when = appointment ? DateTime.fromISO(appointment.starts_at, { zone: "utc" }).setZone(appointment.timezone).toFormat("ccc, LLL d, h:mm a") : "";
  const text = `${row.event_type.replaceAll("_", " ")} ${when}. Times shown in ${appointment?.timezone ?? tenant?.timezone}.`;
  const ics = appointment ? buildIcs({ uid: `${appointment.id}@overdrive`, title: tenant?.name ?? "Appointment", description: text, startsAt: appointment.starts_at, endsAt: appointment.ends_at, timezone: appointment.timezone }) : null;
  const recipients = [...(settings?.recipients ?? [])];
  return { from, to: recipients, replyTo: settings?.reply_to ?? undefined, subject: `${tenant?.name ?? "Appointment"} · ${when}`, html: escapeHtml(text), text, ics };
}
