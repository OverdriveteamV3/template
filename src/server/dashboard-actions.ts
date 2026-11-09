"use server";

import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { assertNoExecutableContent, siteDocumentSchema, themeSchema } from "@/lib/content/schema";
import { detectUpload } from "@/lib/uploads/signature";
import { formSchema } from "@/lib/forms/validate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { referenceTheme } from "@/lib/theme/tokens";
import { presets } from "@/lib/presets";
import { emptyDocument } from "@/server/site";
import { requireMember, requirePlatformAdmin } from "@/server/guards";

async function clientForTenant() {
  const context = await requireMember();
  return { context, supabase: await createClient() };
}

export async function saveService(formData: FormData) {
  const { context, supabase } = await clientForTenant();
  if (context.viewer.role === "staff") return { error: "Staff cannot edit services." };
  const { error } = await supabase.from("services").insert({
    tenant_id: context.site.tenantId,
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    duration_minutes: Number(formData.get("duration") ?? 60),
    price_cents: formData.get("price") ? Math.round(Number(formData.get("price")) * 100) : null,
    show_price: formData.get("showPrice") === "on",
    buffer_before_minutes: Number(formData.get("bufferBefore") ?? 0),
    buffer_after_minutes: Number(formData.get("bufferAfter") ?? 0),
    location: String(formData.get("location") ?? ""),
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/services");
  return { ok: true as const };
}

export async function archiveService(formData: FormData) {
  const { context, supabase } = await clientForTenant();
  if (context.viewer.role === "staff") return { error: "Staff cannot archive services." };
  await supabase.from("services").update({ active: false, archived_at: new Date().toISOString() }).eq("id", String(formData.get("id"))).eq("tenant_id", context.site.tenantId);
  revalidatePath("/dashboard/services");
}

export async function saveStaff(formData: FormData) {
  const { context, supabase } = await clientForTenant();
  if (context.viewer.role === "staff") return { error: "Staff cannot add staff." };
  const { data, error } = await supabase.from("staff").insert({
    tenant_id: context.site.tenantId,
    display_name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "") || null,
    timezone: context.site.timezone,
  }).select("id").single();
  if (error || !data) return { error: error?.message ?? "Could not add staff." };
  const days = formData.getAll("weekday").map(Number);
  if (days.length) {
    await supabase.from("working_hours").insert(days.map((weekday) => ({ tenant_id: context.site.tenantId, staff_id: data.id, weekday, start_minute: 9 * 60, end_minute: 17 * 60 })));
  }
  revalidatePath("/dashboard/staff");
  return { ok: true as const };
}

export async function blockTime(formData: FormData) {
  const { context, supabase } = await clientForTenant();
  const { data } = await supabase.rpc("create_blocked_time", {
    p_tenant_id: context.site.tenantId,
    p_staff_id: String(formData.get("staffId")),
    p_starts_at: String(formData.get("startsAt")),
    p_ends_at: String(formData.get("endsAt")),
    p_reason: String(formData.get("reason") ?? "Blocked"),
  });
  revalidatePath("/dashboard/calendar");
  return data as { ok?: boolean; error?: string };
}

export async function setStatus(formData: FormData) {
  const supabase = (await clientForTenant()).supabase;
  const { data } = await supabase.rpc("set_appointment_status", {
    p_appointment_id: String(formData.get("appointmentId")),
    p_status: String(formData.get("status")),
  });
  revalidatePath("/dashboard/appointments");
  return data as { ok?: boolean; error?: string };
}

export async function saveBookingRules(formData: FormData) {
  const { context, supabase } = await clientForTenant();
  if (context.viewer.role === "staff") return { error: "Staff cannot change booking rules." };
  const { error } = await supabase.from("tenant_booking_rules").update({
    horizon_days: Number(formData.get("horizonDays")),
    min_notice_minutes: Number(formData.get("minNotice")),
    slot_interval_minutes: Number(formData.get("interval")),
    cancellation_cutoff_minutes: Number(formData.get("cancelCutoff")),
    reschedule_cutoff_minutes: Number(formData.get("rescheduleCutoff")),
  }).eq("tenant_id", context.site.tenantId);
  if (error) return { error: error.message };
  return { ok: true as const };
}

function normalizeSocialHref(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function socialsFromForm(formData: FormData) {
  const labels = formData.getAll("socialLabel").map(String);
  const hrefs = formData.getAll("socialHref").map(String);
  return labels.flatMap((label, index) => {
    const name = label.trim();
    const href = normalizeSocialHref(hrefs[index] ?? "");
    if (!name || !href) return [];
    return [{ label: name, href }];
  }).slice(0, 8);
}

export async function saveWebsite(formData: FormData) {
  const { context, supabase } = await clientForTenant();
  if (context.viewer.role === "staff") return { error: "Staff cannot edit the website." };
  const { data: draft } = await supabase.from("website_versions").select("id, document, theme").eq("tenant_id", context.site.tenantId).eq("status", "draft").maybeSingle();
  if (!draft) return { error: "No draft exists." };
  const document = siteDocumentSchema.parse({ ...draft.document, identity: { ...(draft.document as { identity: object }).identity, name: String(formData.get("name")), category: String(formData.get("category")), tagline: String(formData.get("tagline")) }, about: { ...(draft.document as { about: object }).about, short: String(formData.get("about")), companyBio: String(formData.get("companyBio") ?? ""), visible: formData.get("aboutVisible") === "on" }, contact: { ...(draft.document as { contact: object }).contact, email: String(formData.get("email")), phone: String(formData.get("phone")), address: String(formData.get("address")), hours: String(formData.get("hours")), socials: socialsFromForm(formData) }, seo: { ...(draft.document as { seo: object }).seo, title: String(formData.get("seoTitle")), description: String(formData.get("seoDescription")), indexable: formData.get("indexable") === "on" } });
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const theme = themeSchema.parse({ ...(draft.theme as object), primary: String(formData.get("primary")), secondary: String(formData.get("secondary")), background: String(formData.get("background")), surface: String(formData.get("surface")), foreground: String(formData.get("foreground")), muted: String(formData.get("muted")), border: String(formData.get("border")) });
  const { error } = await supabase.from("website_versions").update({ document, theme }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (error) return { error: error.message };
  return { ok: true as const };
}

async function saveHeroImageField(formData: FormData, field: "imageUrl" | "landingImageUrl") {
  const { context, supabase } = await clientForTenant();
  if (context.viewer.role === "staff") return { error: "Staff cannot edit the website." };
  const { data: draft } = await supabase.from("website_versions").select("id, document").eq("tenant_id", context.site.tenantId).eq("status", "draft").maybeSingle();
  if (!draft) return { error: "No draft exists." };
  let imageUrl = String(formData.get(field) ?? "").trim();
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > 5_000_000) return { error: "Files must be 5 MB or smaller." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = detectUpload(bytes);
    if (!kind || kind.mime === "application/pdf") return { error: "Use a JPEG, PNG, or WebP image." };
    const path = `${context.site.tenantId}/${crypto.randomUUID()}.${kind.ext}`;
    const uploaded = await supabase.storage.from("brand").upload(path, bytes, { contentType: kind.mime, upsert: false });
    if (uploaded.error) return { error: uploaded.error.message };
    const { error: assetError } = await supabase.from("assets").insert({
      tenant_id: context.site.tenantId,
      storage_path: path,
      mime: kind.mime,
      byte_size: bytes.byteLength,
      kind: "brand",
      visibility: "public",
      created_by: context.viewer.id,
    });
    if (assetError) return { error: assetError.message };
    imageUrl = supabase.storage.from("brand").getPublicUrl(path).data.publicUrl;
  }
  const current = draft.document as { hero: object };
  const document = siteDocumentSchema.parse({ ...draft.document, hero: { ...current.hero, [field]: imageUrl } });
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const { error } = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function saveLogo(formData: FormData) {
  const { context, supabase } = await clientForTenant();
  if (context.viewer.role === "staff") return { error: "Staff cannot edit the website." };
  const { data: draft } = await supabase.from("website_versions").select("id, document").eq("tenant_id", context.site.tenantId).eq("status", "draft").maybeSingle();
  if (!draft) return { error: "No draft exists." };
  let logoUrl = String(formData.get("logoUrl") ?? "").trim();
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > 5_000_000) return { error: "Files must be 5 MB or smaller." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = detectUpload(bytes);
    if (!kind || kind.mime === "application/pdf") return { error: "Use a JPEG, PNG, or WebP image." };
    const path = `${context.site.tenantId}/${crypto.randomUUID()}.${kind.ext}`;
    const uploaded = await supabase.storage.from("brand").upload(path, bytes, { contentType: kind.mime, upsert: false });
    if (uploaded.error) return { error: uploaded.error.message };
    const { error: assetError } = await supabase.from("assets").insert({
      tenant_id: context.site.tenantId,
      storage_path: path,
      mime: kind.mime,
      byte_size: bytes.byteLength,
      kind: "brand",
      visibility: "public",
      created_by: context.viewer.id,
    });
    if (assetError) return { error: assetError.message };
    logoUrl = supabase.storage.from("brand").getPublicUrl(path).data.publicUrl;
  }
  const current = draft.document as { identity: object };
  const document = siteDocumentSchema.parse({ ...draft.document, identity: { ...current.identity, logoUrl } });
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const { error } = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function saveHeroImage(formData: FormData) {
  return saveHeroImageField(formData, "imageUrl");
}

export async function saveHeroLanding(formData: FormData) {
  return saveHeroImageField(formData, "landingImageUrl");
}

export async function uploadBrandAsset(formData: FormData) {
  const { context, supabase } = await clientForTenant();
  if (context.viewer.role === "staff") return { error: "Staff cannot upload brand files." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a file." };
  if (file.size > 5_000_000) return { error: "Files must be 5 MB or smaller." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectUpload(bytes);
  if (!kind) return { error: "Use a JPEG, PNG, WebP, or PDF file." };
  const path = `${context.site.tenantId}/${crypto.randomUUID()}.${kind.ext}`;
  const uploaded = await supabase.storage.from("brand").upload(path, bytes, { contentType: kind.mime, upsert: false });
  if (uploaded.error) return { error: uploaded.error.message };
  const { error } = await supabase.from("assets").insert({
    tenant_id: context.site.tenantId,
    storage_path: path,
    mime: kind.mime,
    byte_size: bytes.byteLength,
    kind: "brand",
    visibility: "public",
    created_by: context.viewer.id,
  });
  if (error) return { error: error.message };
  return { ok: true as const, path };
}

export async function publishWebsite() {
  const { context, supabase } = await clientForTenant();
  const { data } = await supabase.rpc("publish_website", { p_tenant_id: context.site.tenantId });
  updateTag(`tenant-site:${context.site.slug}`);
  revalidatePath("/");
  return data as { ok?: boolean; error?: string };
}

export async function rollbackWebsite(formData: FormData) {
  const { context, supabase } = await clientForTenant();
  const { data } = await supabase.rpc("rollback_website", { p_tenant_id: context.site.tenantId, p_version_id: String(formData.get("versionId")) });
  updateTag(`tenant-site:${context.site.slug}`);
  return data as { ok?: boolean; error?: string };
}

export async function saveForm(formData: FormData) {
  const { context, supabase } = await clientForTenant();
  const kind = String(formData.get("kind"));
  const schema = formSchema.parse({ fields: JSON.parse(String(formData.get("schema") ?? "{\"fields\":[]}")) });
  const { data: definition } = await supabase.from("form_definitions").insert({ tenant_id: context.site.tenantId, kind, name: kind }).select("id").single();
  if (!definition) return { error: "Could not save the form." };
  await supabase.from("form_versions").insert({ tenant_id: context.site.tenantId, form_id: definition.id, version: 1, schema });
  return { ok: true as const };
}

export async function savePolicy(formData: FormData) {
  const { context, supabase } = await clientForTenant();
  if (context.viewer.role === "staff") return { error: "Staff cannot edit policies." };
  const kind = String(formData.get("kind"));
  if (kind !== "privacy" && kind !== "terms" && kind !== "cancellation") return { error: "Unknown policy." };
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) return { error: "Add a title and the policy text." };
  if (!assertNoExecutableContent({ title, body })) return { error: "Policy text cannot include scripts." };
  const { data: existing } = await supabase.from("policy_documents").select("id").eq("tenant_id", context.site.tenantId).eq("slug", kind).maybeSingle();
  let documentId = existing?.id;
  if (!documentId) {
    const inserted = await supabase.from("policy_documents").insert({ tenant_id: context.site.tenantId, kind, slug: kind }).select("id").single();
    if (inserted.error || !inserted.data) return { error: inserted.error?.message ?? "Could not create the policy." };
    documentId = inserted.data.id;
  }
  const { data: latest } = await supabase.from("policy_versions").select("version").eq("document_id", documentId).order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (latest?.version ?? 0) + 1;
  const { error } = await supabase.from("policy_versions").insert({
    tenant_id: context.site.tenantId,
    document_id: documentId,
    version,
    title,
    format: "text",
    body,
    status: "published",
    required_for_booking: formData.get("required") === "on",
    published_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  updateTag(`tenant-site:${context.site.slug}`);
  revalidatePath("/");
  revalidatePath("/dashboard/settings/policies");
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const };
}

export async function saveNotifications(formData: FormData) {
  const { context, supabase } = await clientForTenant();
  const recipients = String(formData.get("recipients") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const { error } = await supabase.from("notification_settings").upsert({
    tenant_id: context.site.tenantId,
    public_contact_email: String(formData.get("publicEmail") ?? "") || null,
    reply_to: String(formData.get("replyTo") ?? "") || null,
    recipients,
    requested_from_address: String(formData.get("requestedFrom") ?? "") || null,
  });
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function addNote(formData: FormData) {
  const { context, supabase } = await clientForTenant();
  await supabase.from("submission_notes").insert({ tenant_id: context.site.tenantId, submission_id: String(formData.get("submissionId")), author_user_id: context.viewer.id, body: String(formData.get("body") ?? "") });
  await supabase.from("submissions").update({ status: String(formData.get("status") ?? "read") }).eq("id", String(formData.get("submissionId"))).eq("tenant_id", context.site.tenantId);
}

export async function provisionBusiness(formData: FormData) {
  const context = await requirePlatformAdmin();
  if (!context.viewer) return { error: "forbidden" };
  const preset = presets.find((item) => item.id === String(formData.get("preset"))) ?? presets[0];
  const name = String(formData.get("name") ?? "");
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("provision_tenant", {
    p_actor: context.viewer.id,
    p_payload: {
      slug: String(formData.get("slug") ?? ""),
      name,
      category: preset.category,
      timezone: String(formData.get("timezone") ?? "America/New_York"),
      preset: preset.id,
      rootDomain: process.env.ROOT_DOMAIN || "localhost",
      ownerEmail: String(formData.get("ownerEmail") ?? ""),
      publicEmail: String(formData.get("publicEmail") ?? ""),
      replyTo: String(formData.get("replyTo") ?? ""),
      recipients: String(formData.get("recipients") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      staffName: "Team member",
      services: preset.services,
      document: emptyDocument(name, preset.category, String(formData.get("tagline") ?? "")),
      theme: { ...referenceTheme, primary: String(formData.get("primary") || referenceTheme.primary) },
      publish: formData.get("publish") === "on",
    },
  });
  if (error) return { error: error.message };
  return data as { ok?: boolean; tenantId?: string; error?: string };
}
