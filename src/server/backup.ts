"use server";

import { revalidatePath } from "next/cache";
import { assertNoExecutableContent, siteDocumentSchema, themeSchema } from "@/lib/content/schema";
import { backupCsv, emptyBackupRow, readBackupCsv, type BackupRow } from "@/lib/backup/csv";
import { MASTER_USER_ID, readMasterProfile, saveMasterProfile } from "@/lib/auth/master";
import { fontPresets, paletteTheme, referenceTheme, type FontPreset, type ThemePalette } from "@/lib/theme/tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMember } from "@/server/guards";
import { ensureWebsiteDraft } from "@/server/dashboard-actions";

const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const statuses = ["confirmed", "completed", "no_show", "cancelled"];

async function editor() {
  const context = await requireMember();
  if (context.viewer.role === "staff") return { error: "Staff cannot export or import the dashboard." as const };
  return { context, admin: createAdminClient() };
}

export async function exportDashboard() {
  const ready = await editor();
  if ("error" in ready) return ready;
  const { context, admin } = ready;
  const tenantId = context.site.tenantId;
  const draft = await ensureWebsiteDraft(admin, tenantId, context.viewer.id);
  const document = (draft?.document ?? {}) as { identity?: { name?: string; category?: string }; about?: { short?: string } };
  const theme = themeSchema.safeParse(draft?.theme).data ?? context.site.theme;
  const [services, staff, hours, links, customers, appointments, rules] = await Promise.all([
    admin.from("services").select("id, name, description, duration_minutes, price_cents, active").eq("tenant_id", tenantId).is("archived_at", null).order("sort_order"),
    admin.from("staff").select("id, display_name, email, active").eq("tenant_id", tenantId).is("archived_at", null).order("display_name"),
    admin.from("working_hours").select("staff_id, weekday, start_minute, end_minute").eq("tenant_id", tenantId),
    admin.from("staff_services").select("staff_id, service_id").eq("tenant_id", tenantId),
    admin.from("tenant_customers").select("full_name, email, phone").eq("tenant_id", tenantId).order("full_name"),
    admin.from("appointments").select("starts_at, ends_at, status, customer_note, customer_id, service_id, staff_id").eq("tenant_id", tenantId).order("starts_at"),
    admin.from("tenant_booking_rules").select("horizon_days, min_notice_minutes, slot_interval_minutes, cancellation_cutoff_minutes, reschedule_cutoff_minutes").eq("tenant_id", tenantId).maybeSingle(),
  ]);
  const staffName = new Map((staff.data ?? []).map((person) => [person.id, person.display_name]));
  const serviceName = new Map((services.data ?? []).map((service) => [service.id, service.name]));
  const customerRows = customers.data ?? [];
  const rows: BackupRow[] = [];
  const setting = (key: string, value: string) => { const row = emptyBackupRow("setting"); row.key = key; row.value = value; rows.push(row); };
  setting("business_name", document.identity?.name || context.site.name);
  setting("category", document.identity?.category || context.site.category);
  setting("tagline", document.about?.short || context.site.tagline);
  setting("timezone", context.site.timezone);
  setting("theme_primary", theme.primary);
  setting("theme_secondary", theme.secondary);
  setting("theme_background", theme.background);
  setting("theme_foreground", theme.foreground);
  setting("theme_font", theme.font);
  setting("theme_mode", theme.mode);
  let profileName = "";
  let profilePhone = "";
  if (context.viewer.id === MASTER_USER_ID) {
    const profile = await readMasterProfile();
    profileName = profile.name;
    profilePhone = profile.phone;
  } else {
    const profile = await admin.from("customer_profiles").select("full_name, phone").eq("user_id", context.viewer.id).maybeSingle();
    profileName = profile.data?.full_name ?? "";
    profilePhone = profile.data?.phone ?? "";
  }
  setting("profile_name", profileName);
  setting("profile_phone", profilePhone);
  if (rules.data) {
    setting("booking_horizon_days", String(rules.data.horizon_days));
    setting("booking_min_notice", String(rules.data.min_notice_minutes));
    setting("booking_interval", String(rules.data.slot_interval_minutes));
    setting("booking_cancel_cutoff", String(rules.data.cancellation_cutoff_minutes));
    setting("booking_reschedule_cutoff", String(rules.data.reschedule_cutoff_minutes));
  }
  for (const service of services.data ?? []) {
    const row = emptyBackupRow("service");
    row.name = service.name;
    row.duration = String(service.duration_minutes);
    row.price = service.price_cents == null ? "" : (service.price_cents / 100).toFixed(2);
    row.status = service.active ? "active" : "off";
    row.note = service.description;
    rows.push(row);
  }
  for (const person of staff.data ?? []) {
    const row = emptyBackupRow("staff");
    row.name = person.display_name;
    row.email = person.email ?? "";
    row.status = person.active ? "active" : "off";
    rows.push(row);
  }
  for (const link of links.data ?? []) {
    const row = emptyBackupRow("assignment");
    row.staff = staffName.get(link.staff_id) ?? "";
    row.service = serviceName.get(link.service_id) ?? "";
    if (row.staff && row.service) rows.push(row);
  }
  for (const hour of hours.data ?? []) {
    const row = emptyBackupRow("hours");
    row.staff = staffName.get(hour.staff_id) ?? "";
    row.weekday = weekdays[hour.weekday] ?? String(hour.weekday);
    row.start = clock(hour.start_minute);
    row.end = clock(hour.end_minute);
    if (row.staff) rows.push(row);
  }
  for (const customer of customerRows) {
    const row = emptyBackupRow("customer");
    row.name = customer.full_name;
    row.email = customer.email;
    row.phone = customer.phone ?? "";
    rows.push(row);
  }
  const idToCustomer = new Map<string, { email: string }>();
  const listed = await admin.from("tenant_customers").select("id, email").eq("tenant_id", tenantId);
  for (const customer of listed.data ?? []) idToCustomer.set(customer.id, customer);
  for (const appointment of appointments.data ?? []) {
    const row = emptyBackupRow("appointment");
    row.email = idToCustomer.get(appointment.customer_id)?.email ?? "";
    row.service = serviceName.get(appointment.service_id) ?? "";
    row.staff = staffName.get(appointment.staff_id) ?? "";
    row.starts = appointment.starts_at;
    row.ends = appointment.ends_at;
    row.status = appointment.status;
    row.note = appointment.customer_note ?? "";
    rows.push(row);
  }
  return { csv: backupCsv(rows), filename: `overdrive-dashboard-${new Date().toISOString().slice(0, 10)}.csv` };
}

export async function importDashboard(formData: FormData) {
  const ready = await editor();
  if ("error" in ready) return ready;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 2_000_000) return { error: "Choose a dashboard CSV under 2 MB." };
  const parsed = readBackupCsv(await file.text());
  if ("error" in parsed) return { error: "This file is not a dashboard CSV." };
  const { context, admin } = ready;
  const tenantId = context.site.tenantId;
  const rows = parsed.rows;
  let count = 0;
  let skipped = 0;
  const settings = new Map(rows.filter((row) => row.record === "setting" && row.key).map((row) => [row.key, row.value]));
  const draft = await ensureWebsiteDraft(admin, tenantId, context.viewer.id);
  if (draft && (settings.has("business_name") || settings.has("category") || settings.has("tagline") || [...settings.keys()].some((key) => key.startsWith("theme_")))) {
    const current = draft.document as { identity: object; about: object };
    const theme = themeSchema.safeParse(draft.theme).data ?? { ...referenceTheme, ...context.site.theme };
    const requestedFont = settings.get("theme_font") || theme.font;
    const palette: ThemePalette = {
      primary: settings.get("theme_primary") || theme.primary,
      secondary: settings.get("theme_secondary") || theme.secondary,
      background: settings.get("theme_background") || theme.background,
      foreground: settings.get("theme_foreground") || theme.foreground,
      font: (fontPresets as readonly string[]).includes(requestedFont) ? requestedFont as FontPreset : theme.font,
      mode: settings.has("theme_mode") ? (settings.get("theme_mode") === "dark" ? "dark" : "light") : theme.mode,
    };
    const document = siteDocumentSchema.parse({
      ...draft.document,
      identity: { ...current.identity, name: settings.get("business_name") || context.site.name, category: settings.get("category") ?? context.site.category, tagline: settings.get("tagline") ?? context.site.tagline },
      about: { ...current.about, short: settings.get("tagline") ?? context.site.tagline },
    });
    if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
    const nextTheme = paletteTheme(palette);
    const sameColors = theme.background.toLowerCase() === nextTheme.background && theme.foreground.toLowerCase() === nextTheme.foreground;
    const themeDocument = sameColors ? { ...nextTheme, surface: theme.surface, muted: theme.muted, border: theme.border } : nextTheme;
    const saved = await admin.from("website_versions").update({ document, theme: themeSchema.parse(themeDocument) }).eq("id", draft.id).eq("tenant_id", tenantId);
    if (saved.error) return { error: saved.error.message };
    count += settings.size;
  }
  if (settings.has("timezone")) {
    await admin.from("tenants").update({ timezone: settings.get("timezone") }).eq("id", tenantId);
  }
  const ruleUpdate: Record<string, number> = {};
  const rule = (key: string, column: string, allowed?: number[]) => {
    if (!settings.has(key)) return;
    const value = Number(settings.get(key));
    if (!Number.isInteger(value) || value < 0) return;
    if (allowed && !allowed.includes(value)) return;
    ruleUpdate[column] = value;
  };
  rule("booking_horizon_days", "horizon_days");
  rule("booking_min_notice", "min_notice_minutes");
  rule("booking_interval", "slot_interval_minutes", [5, 10, 15, 20, 30, 60]);
  rule("booking_cancel_cutoff", "cancellation_cutoff_minutes");
  rule("booking_reschedule_cutoff", "reschedule_cutoff_minutes");
  if (Object.keys(ruleUpdate).length) await admin.from("tenant_booking_rules").update(ruleUpdate).eq("tenant_id", tenantId);

  const serviceRows = await admin.from("services").select("id, name").eq("tenant_id", tenantId).is("archived_at", null);
  const services = new Map((serviceRows.data ?? []).map((service) => [service.name.toLowerCase(), service.id]));
  for (const row of rows.filter((item) => item.record === "service" && item.name)) {
    const duration = Number(row.duration);
    if (!Number.isInteger(duration) || duration < 5 || duration > 480) { skipped += 1; continue; }
    const price = row.price ? Math.round(Number(row.price) * 100) : null;
    const payload = { name: row.name, description: row.note, duration_minutes: duration, price_cents: Number.isFinite(price ?? 0) ? price : null, active: row.status !== "off" };
    const existing = services.get(row.name.toLowerCase());
    const saved = existing
      ? await admin.from("services").update(payload).eq("id", existing).eq("tenant_id", tenantId)
      : await admin.from("services").insert({ ...payload, tenant_id: tenantId }).select("id").single();
    if (saved.error) { skipped += 1; continue; }
    if (!existing && "data" in saved && saved.data) services.set(row.name.toLowerCase(), saved.data.id);
    count += 1;
  }

  const staffRows = await admin.from("staff").select("id, display_name").eq("tenant_id", tenantId).is("archived_at", null);
  const staff = new Map((staffRows.data ?? []).map((person) => [person.display_name.toLowerCase(), person.id]));
  for (const row of rows.filter((item) => item.record === "staff" && item.name)) {
    const payload = { display_name: row.name, email: row.email || null, active: row.status !== "off" };
    const existing = staff.get(row.name.toLowerCase());
    const saved = existing
      ? await admin.from("staff").update(payload).eq("id", existing).eq("tenant_id", tenantId)
      : await admin.from("staff").insert({ ...payload, tenant_id: tenantId, timezone: settings.get("timezone") || context.site.timezone }).select("id").single();
    if (saved.error) { skipped += 1; continue; }
    if (!existing && "data" in saved && saved.data) staff.set(row.name.toLowerCase(), saved.data.id);
    count += 1;
  }

  for (const row of rows.filter((item) => item.record === "assignment" && item.staff && item.service)) {
    const staffId = staff.get(row.staff.toLowerCase());
    const serviceId = services.get(row.service.toLowerCase());
    if (!staffId || !serviceId) { skipped += 1; continue; }
    const saved = await admin.from("staff_services").upsert({ tenant_id: tenantId, staff_id: staffId, service_id: serviceId });
    if (saved.error) skipped += 1;
    else count += 1;
  }

  const hourRows = rows.filter((item) => item.record === "hours" && item.staff);
  const hoursByStaff = new Map<string, { weekday: number; start: number; end: number }[]>();
  for (const row of hourRows) {
    const staffId = staff.get(row.staff.toLowerCase());
    const weekday = weekdays.indexOf(row.weekday.toLowerCase());
    const start = clockMinutes(row.start);
    const end = clockMinutes(row.end);
    if (!staffId || weekday < 0 || start == null || end == null || end <= start) { skipped += 1; continue; }
    const list = hoursByStaff.get(staffId) ?? [];
    if (list.some((item) => item.weekday === weekday)) { skipped += 1; continue; }
    list.push({ weekday, start, end });
    hoursByStaff.set(staffId, list);
  }
  for (const [staffId, windows] of hoursByStaff) {
    const removed = await admin.from("working_hours").delete().eq("tenant_id", tenantId).eq("staff_id", staffId);
    if (removed.error) { skipped += windows.length; continue; }
    const inserted = await admin.from("working_hours").insert(windows.map((window) => ({ tenant_id: tenantId, staff_id: staffId, weekday: window.weekday, start_minute: window.start, end_minute: window.end })));
    if (inserted.error) skipped += windows.length;
    else count += windows.length;
  }

  for (const row of rows.filter((item) => item.record === "customer" && item.email)) {
    const email = row.email.toLowerCase();
    const existing = await admin.from("tenant_customers").select("id").eq("tenant_id", tenantId).ilike("email", email).maybeSingle();
    const payload = { full_name: row.name, phone: row.phone || null };
    const saved = existing.data
      ? await admin.from("tenant_customers").update(payload).eq("id", existing.data.id).eq("tenant_id", tenantId)
      : await admin.from("tenant_customers").insert({ ...payload, tenant_id: tenantId, email: row.email });
    if (saved.error) skipped += 1;
    else count += 1;
  }

  const rulesRow = await admin.from("tenant_booking_rules").select("cancellation_cutoff_minutes, reschedule_cutoff_minutes").eq("tenant_id", tenantId).maybeSingle();
  for (const row of rows.filter((item) => item.record === "appointment" && item.email && item.service && item.starts)) {
    const serviceId = services.get(row.service.toLowerCase());
    const staffId = staff.get(row.staff.toLowerCase());
    const customer = await admin.from("tenant_customers").select("id").eq("tenant_id", tenantId).ilike("email", row.email).maybeSingle();
    if (!serviceId || !staffId || !customer.data || !statuses.includes(row.status) || !row.ends || row.ends <= row.starts) { skipped += 1; continue; }
    const existing = await admin.from("appointments").select("id").eq("tenant_id", tenantId).eq("service_id", serviceId).eq("customer_id", customer.data.id).eq("starts_at", row.starts).maybeSingle();
    if (existing.data) {
      const saved = await admin.from("appointments").update({ status: row.status, customer_note: row.note || null }).eq("id", existing.data.id).eq("tenant_id", tenantId);
      if (saved.error) skipped += 1;
      else count += 1;
      continue;
    }
    const hold = await admin.from("resource_holds").insert({ tenant_id: tenantId, staff_id: staffId, span: `[${row.starts},${row.ends || row.starts})`, kind: "appointment", status: row.status === "cancelled" ? "released" : "active" }).select("id").single();
    if (hold.error || !hold.data) { skipped += 1; continue; }
    const saved = await admin.from("appointments").insert({
      tenant_id: tenantId,
      customer_id: customer.data.id,
      staff_id: staffId,
      service_id: serviceId,
      starts_at: row.starts,
      ends_at: row.ends || row.starts,
      hold_id: hold.data.id,
      status: row.status,
      timezone: settings.get("timezone") || context.site.timezone,
      customer_note: row.note || null,
      source: "owner",
      cancellation_cutoff_minutes: rulesRow.data?.cancellation_cutoff_minutes ?? 1440,
      reschedule_cutoff_minutes: rulesRow.data?.reschedule_cutoff_minutes ?? 1440,
    }).select("id").single();
    if (saved.error || !saved.data) {
      await admin.from("resource_holds").delete().eq("id", hold.data.id);
      skipped += 1;
      continue;
    }
    await admin.from("resource_holds").update({ appointment_id: saved.data.id }).eq("id", hold.data.id);
    count += 1;
  }

  if (context.viewer.id === MASTER_USER_ID) {
    if (settings.has("profile_name")) await saveMasterProfile(settings.get("profile_name") || "", settings.get("profile_phone") || "");
  } else if (settings.has("profile_name")) {
    await admin.from("customer_profiles").upsert({ user_id: context.viewer.id, full_name: settings.get("profile_name") || "", phone: settings.get("profile_phone") || null });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/staff");
  return { count, skipped };
}

function clock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function clockMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}
