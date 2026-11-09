"use server";

import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { assertNoExecutableContent, siteDocumentSchema, themePresetsSchema, themeSchema, type ThemePreset } from "@/lib/content/schema";
import { detectUpload } from "@/lib/uploads/signature";
import { formSchema } from "@/lib/forms/validate";
import { readReviewPages } from "@/lib/reviews/read";
import { MASTER_USER_ID } from "@/lib/auth/master";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeHex } from "@/lib/theme/contrast";
import { fontPresets, paletteTheme, referenceTheme, type FontPreset, type ThemePalette } from "@/lib/theme/tokens";
import { presets } from "@/lib/presets";
import { emptyDocument } from "@/server/site";
import { requireMember, requirePlatformAdmin } from "@/server/guards";

async function clientForTenant() {
  const context = await requireMember();
  return { context, supabase: await createClient() };
}

async function editorDb() {
  const context = await requireMember();
  const supabase = context.viewer.id === MASTER_USER_ID ? createAdminClient() : await createClient();
  return { context, supabase };
}

export async function ensureWebsiteDraft(supabase: ReturnType<typeof createAdminClient>, tenantId: string, actorId: string) {
  const existing = await supabase.from("website_versions").select("id, document, theme").eq("tenant_id", tenantId).eq("status", "draft").maybeSingle();
  if (existing.data) return existing.data;
  const published = await supabase.from("website_versions").select("id, document, theme, version").eq("tenant_id", tenantId).eq("status", "published").maybeSingle();
  if (!published.data) return null;
  const latest = await supabase.from("website_versions").select("version").eq("tenant_id", tenantId).order("version", { ascending: false }).limit(1).maybeSingle();
  const created = await supabase.from("website_versions").insert({
    tenant_id: tenantId,
    version: (latest.data?.version ?? published.data.version) + 1,
    status: "draft",
    document: published.data.document,
    theme: published.data.theme,
    created_by: actorId,
    parent_version_id: published.data.id,
  }).select("id, document, theme").single();
  return created.data;
}

async function draftForEdit() {
  const { context, supabase } = await editorDb();
  if (context.viewer.role === "staff") return { error: "Staff cannot edit the website." as const };
  const draft = await ensureWebsiteDraft(supabase, context.site.tenantId, context.viewer.id);
  if (!draft) return { error: "No published website to edit." as const };
  return { context, supabase, draft };
}

async function storeBrandImage(supabase: ReturnType<typeof createAdminClient>, tenantId: string, actorId: string, file: File) {
  if (file.size > 5_000_000) return { error: "Files must be 5 MB or smaller." as const };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectUpload(bytes);
  if (!kind || kind.mime === "application/pdf") return { error: "Use a JPEG, PNG, or WebP image." as const };
  const path = `${tenantId}/${crypto.randomUUID()}.${kind.ext}`;
  const uploaded = await supabase.storage.from("brand").upload(path, bytes, { contentType: kind.mime, upsert: false });
  if (uploaded.error) return { error: uploaded.error.message };
  const { error: assetError } = await supabase.from("assets").insert({
    tenant_id: tenantId,
    storage_path: path,
    mime: kind.mime,
    byte_size: bytes.byteLength,
    kind: "brand",
    visibility: "public",
    created_by: actorId,
  });
  if (assetError) return { error: assetError.message };
  return { url: supabase.storage.from("brand").getPublicUrl(path).data.publicUrl };
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

export async function saveCatalogServiceForm(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
  const { context, supabase } = await editorDb();
  if (context.viewer.role === "staff") return { error: "Staff cannot edit services." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a service name." };
  const price = String(formData.get("price") ?? "").trim();
  const { error } = await supabase.from("services").insert({
    tenant_id: context.site.tenantId,
    name,
    description: "",
    duration_minutes: Math.min(480, Math.max(5, Number(formData.get("duration") ?? 60) || 60)),
    price_cents: price ? Math.round(Number(price) * 100) : null,
    show_price: Boolean(price),
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings/website");
  revalidatePath("/");
  return { ok: true as const };
}

export async function updateCatalogServiceForm(formData: FormData) {
  const { context, supabase } = await editorDb();
  if (context.viewer.role === "staff") return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const price = String(formData.get("price") ?? "").trim();
  await supabase.from("services").update({
    name,
    duration_minutes: Math.min(480, Math.max(5, Number(formData.get("duration") ?? 60) || 60)),
    price_cents: price ? Math.round(Number(price) * 100) : null,
    show_price: Boolean(price),
  }).eq("id", String(formData.get("id"))).eq("tenant_id", context.site.tenantId);
  revalidatePath("/dashboard/settings/website");
  revalidatePath("/");
}

export async function archiveCatalogServiceForm(formData: FormData) {
  const { context, supabase } = await editorDb();
  if (context.viewer.role === "staff") return;
  await supabase.from("services").update({ active: false, archived_at: new Date().toISOString() }).eq("id", String(formData.get("id"))).eq("tenant_id", context.site.tenantId);
  revalidatePath("/dashboard/settings/website");
  revalidatePath("/");
}

export async function assignCatalogServiceStaffForm(formData: FormData) {
  const { context, supabase } = await editorDb();
  if (context.viewer.role === "staff") return;
  const serviceId = String(formData.get("serviceId") ?? "");
  if (!serviceId) return;
  const people = await supabase.from("staff").select("id").eq("tenant_id", context.site.tenantId).is("archived_at", null);
  if (people.error) return;
  const allowed = new Set((people.data ?? []).map((person) => person.id));
  const chosen = [...new Set(formData.getAll("staffId").map(String))].filter((id) => allowed.has(id));
  const cleared = await supabase.from("staff_services").delete().eq("tenant_id", context.site.tenantId).eq("service_id", serviceId);
  if (cleared.error) return;
  if (chosen.length) {
    await supabase.from("staff_services").insert(chosen.map((staffId) => ({ tenant_id: context.site.tenantId, staff_id: staffId, service_id: serviceId })));
  }
  revalidatePath("/dashboard/settings/website");
  revalidatePath("/");
}

export async function saveCatalogStaffForm(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
  const { context, supabase } = await editorDb();
  if (context.viewer.role === "staff") return { error: "Staff cannot add staff." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a name." };
  const { error } = await supabase.from("staff").insert({
    tenant_id: context.site.tenantId,
    display_name: name,
    timezone: context.site.timezone,
    active: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings/website");
  revalidatePath("/");
  return { ok: true as const };
}

export async function setStaffActiveForm(formData: FormData) {
  const { context, supabase } = await editorDb();
  if (context.viewer.role === "staff") return;
  await supabase.from("staff").update({ active: formData.get("active") === "on" }).eq("id", String(formData.get("id"))).eq("tenant_id", context.site.tenantId);
  revalidatePath("/dashboard/settings/website");
  revalidatePath("/");
}

export async function renameCatalogStaffForm(formData: FormData) {
  const { context, supabase } = await editorDb();
  if (context.viewer.role === "staff") return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await supabase.from("staff").update({ display_name: name }).eq("id", String(formData.get("id"))).eq("tenant_id", context.site.tenantId);
  revalidatePath("/dashboard/settings/website");
  revalidatePath("/");
}

export async function archiveCatalogStaffForm(formData: FormData) {
  const { context, supabase } = await editorDb();
  if (context.viewer.role === "staff") return;
  await supabase.from("staff").update({ active: false, archived_at: new Date().toISOString() }).eq("id", String(formData.get("id"))).eq("tenant_id", context.site.tenantId);
  revalidatePath("/dashboard/settings/website");
  revalidatePath("/");
}

export async function saveOpenHoursForm(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
  const { context, supabase } = await editorDb();
  if (context.viewer.role === "staff") return { error: "Staff cannot change hours." };
  const people = await supabase.from("staff").select("id").eq("tenant_id", context.site.tenantId).is("archived_at", null);
  if (people.error) return { error: people.error.message };
  const rows = [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) => {
    if (formData.get(`open-${weekday}`) !== "on") return [];
    const start = minutesFromTime(String(formData.get(`start-${weekday}`) ?? "09:00"));
    const end = minutesFromTime(String(formData.get(`end-${weekday}`) ?? "17:00"));
    if (end <= start) return [];
    return (people.data ?? []).map((person) => ({ tenant_id: context.site.tenantId, staff_id: person.id, weekday, start_minute: start, end_minute: end }));
  });
  const cleared = await supabase.from("working_hours").delete().eq("tenant_id", context.site.tenantId);
  if (cleared.error) return { error: cleared.error.message };
  if (rows.length) {
    const inserted = await supabase.from("working_hours").insert(rows);
    if (inserted.error) return { error: inserted.error.message };
  }
  revalidatePath("/dashboard/settings/website");
  revalidatePath("/");
  return { ok: true as const };
}

function minutesFromTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return Math.min(24 * 60, Math.max(0, hour * 60 + minute));
}

export async function saveBookingRulesForm(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
  const { context, supabase } = await editorDb();
  if (context.viewer.role === "staff") return { error: "Staff cannot change booking rules." };
  const { error } = await supabase.from("tenant_booking_rules").update({
    horizon_days: Number(formData.get("horizonDays")),
    min_notice_minutes: Number(formData.get("minNotice")),
    slot_interval_minutes: Number(formData.get("interval")),
  }).eq("tenant_id", context.site.tenantId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings/website");
  revalidatePath("/");
  return { ok: true as const };
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

export async function blockTimeForm(formData: FormData) {
  await blockTime(formData);
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

function paletteFromForm(formData: FormData): ThemePalette | { error: string } {
  const requested = String(formData.get("font") ?? "geist");
  const font = (fontPresets as readonly string[]).includes(requested) ? requested as FontPreset : "geist";
  const palette: ThemePalette = {
    primary: String(formData.get("primary") ?? "").trim(),
    secondary: String(formData.get("secondary") ?? ""),
    background: String(formData.get("background") ?? ""),
    foreground: String(formData.get("foreground") ?? ""),
    font,
    mode: formData.get("mode") === "dark" ? "dark" : "light",
  };
  const colors = [palette.primary, palette.secondary, palette.background, palette.foreground].map((value) => normalizeHex(value));
  if (!palette.primary || colors.some((value) => !value)) return { error: "Use a color code like #111111." };
  return { ...palette, primary: colors[0]!, secondary: colors[1]!, background: colors[2]!, foreground: colors[3]! };
}

function storedPresets(document: unknown) {
  return themePresetsSchema.safeParse((document as { themePresets?: unknown }).themePresets).data ?? [];
}

export async function saveTheme(formData: FormData) {
  const primary = String(formData.get("primary") ?? "").trim();
  if (!primary) return { ok: true as const };
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  const palette = paletteFromForm(formData);
  if ("error" in palette) return palette;
  const next = paletteTheme(palette);
  const previous = themeSchema.safeParse({ ...referenceTheme, ...(draft.theme as object) });
  const theme = previous.success && previous.data.background.toLowerCase() === next.background && previous.data.foreground.toLowerCase() === next.foreground
    ? { ...next, surface: previous.data.surface, muted: previous.data.muted, border: previous.data.border }
    : next;
  const { error } = await supabase.from("website_versions").update({ theme: themeSchema.parse(theme) }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const };
}

export async function saveThemePreset(formData: FormData) {
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name this theme." };
  const palette = paletteFromForm(formData);
  if ("error" in palette) return palette;
  const preset: ThemePreset = { name, ...palette };
  const next = [...storedPresets(draft.document).filter((item) => item.name.toLowerCase() !== name.toLowerCase()), preset];
  if (next.length > 12) return { error: "You can save 12 themes." };
  let document;
  try {
    document = siteDocumentSchema.parse({ ...draft.document, themePresets: next });
  } catch {
    return { error: "The theme could not be saved." };
  }
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const saved = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (saved.error) return { error: saved.error.message };
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const, presets: next };
}

export async function deleteThemePreset(formData: FormData) {
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  const name = String(formData.get("name") ?? "").trim().toLowerCase();
  const next = storedPresets(draft.document).filter((item) => item.name.toLowerCase() !== name);
  let document;
  try {
    document = siteDocumentSchema.parse({ ...draft.document, themePresets: next });
  } catch {
    return { error: "The theme could not be removed." };
  }
  const saved = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (saved.error) return { error: saved.error.message };
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const, presets: next };
}

export async function saveWebsite(formData: FormData) {
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  const document = siteDocumentSchema.parse({ ...draft.document, identity: { ...(draft.document as { identity: object }).identity, name: String(formData.get("name")), category: String(formData.get("category")), tagline: String(formData.get("tagline")) }, about: { ...(draft.document as { about: object }).about, short: String(formData.get("about")), companyBio: String(formData.get("companyBio") ?? ""), visible: formData.get("aboutVisible") === "on" }, contact: { ...(draft.document as { contact: object }).contact, email: String(formData.get("email")), phone: String(formData.get("phone")), address: String(formData.get("address")), hours: String(formData.get("hours")), socials: socialsFromForm(formData) }, seo: { ...(draft.document as { seo: object }).seo, title: String(formData.get("seoTitle")), description: String(formData.get("seoDescription")), indexable: formData.get("indexable") === "on" } });
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const theme = themeSchema.parse({ ...(draft.theme as object), primary: String(formData.get("primary")), secondary: String(formData.get("secondary")), background: String(formData.get("background")), surface: String(formData.get("surface")), foreground: String(formData.get("foreground")), muted: String(formData.get("muted")), border: String(formData.get("border")) });
  const { error } = await supabase.from("website_versions").update({ document, theme }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (error) return { error: error.message };
  return { ok: true as const };
}

async function saveHeroImageField(formData: FormData, field: "imageUrl" | "landingImageUrl") {
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  let imageUrl = String(formData.get(field) ?? "").trim();
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const stored = await storeBrandImage(supabase, context.site.tenantId, context.viewer.id, file);
    if ("error" in stored) return stored;
    imageUrl = stored.url;
  }
  const current = draft.document as { hero: object };
  const document = siteDocumentSchema.parse({ ...draft.document, hero: { ...current.hero, [field]: imageUrl } });
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const { error } = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function saveLogo(formData: FormData) {
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  let logoUrl = String(formData.get("logoUrl") ?? "").trim();
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const stored = await storeBrandImage(supabase, context.site.tenantId, context.viewer.id, file);
    if ("error" in stored) return stored;
    logoUrl = stored.url;
  }
  const current = draft.document as { identity: object };
  const document = siteDocumentSchema.parse({ ...draft.document, identity: { ...current.identity, logoUrl, logoInFooter: formData.get("logoInFooter") === "on" } });
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const { error } = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const };
}

export async function saveHeroImage(formData: FormData) {
  return saveHeroImageField(formData, "imageUrl");
}

export async function saveHeroLanding(formData: FormData) {
  return saveHeroImageField(formData, "landingImageUrl");
}

export async function saveHeroSection(formData: FormData) {
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  const current = draft.document as { identity: object; about: object; hero: { imageUrl?: string; landingImageUrl?: string } };
  let imageUrl = String(formData.get("imageUrl") ?? current.hero.imageUrl ?? "").trim();
  let landingImageUrl = String(formData.get("landingImageUrl") ?? current.hero.landingImageUrl ?? "").trim();
  const portrait = formData.get("portraitFile");
  const background = formData.get("backgroundFile");
  if (portrait instanceof File && portrait.size > 0) {
    const stored = await storeBrandImage(supabase, context.site.tenantId, context.viewer.id, portrait);
    if ("error" in stored) return stored;
    imageUrl = stored.url;
  }
  if (background instanceof File && background.size > 0) {
    const stored = await storeBrandImage(supabase, context.site.tenantId, context.viewer.id, background);
    if ("error" in stored) return stored;
    landingImageUrl = stored.url;
  }
  const opacity = Math.min(100, Math.max(0, Math.round(Number(formData.get("backgroundOpacity") ?? 25))));
  const document = siteDocumentSchema.parse({
    ...draft.document,
    identity: { ...current.identity, name: String(formData.get("name") ?? ""), category: String(formData.get("category") ?? ""), tagline: String(formData.get("about") ?? "") },
    about: { ...current.about, short: String(formData.get("about") ?? ""), visible: true },
    hero: { ...current.hero, imageUrl, landingImageUrl, backgroundOpacity: opacity, showCalendar: formData.get("showCalendar") !== "off", showPortrait: formData.get("showPortrait") !== "off" },
  });
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const { error } = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const };
}

export async function saveLogoForm(formData: FormData) {
  await saveLogo(formData);
}

export async function saveHeroForm(formData: FormData) {
  await saveHeroSection(formData);
}

export async function setShowPortrait(formData: FormData) {
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  const showPortrait = formData.get("showPortrait") === "on";
  const current = draft.document as { hero: object };
  let document;
  try {
    document = siteDocumentSchema.parse({ ...draft.document, hero: { ...current.hero, showPortrait } });
  } catch {
    return { error: "The portrait could not be updated." };
  }
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const saved = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (saved.error) return { error: saved.error.message };
  const published = await supabase.from("website_versions").select("id, document").eq("tenant_id", context.site.tenantId).eq("status", "published").maybeSingle();
  if (published.error) return { error: published.error.message };
  if (published.data) {
    const publishedHero = (published.data.document as { hero?: object }).hero ?? {};
    let publishedDocument;
    try {
      publishedDocument = siteDocumentSchema.parse({ ...(published.data.document as object), hero: { ...publishedHero, showPortrait } });
    } catch {
      return { error: "The portrait could not be updated." };
    }
    const updated = await supabase.from("website_versions").update({ document: publishedDocument }).eq("id", published.data.id).eq("tenant_id", context.site.tenantId);
    if (updated.error) return { error: updated.error.message };
  }
  updateTag(`tenant-site:${context.site.slug}`);
  revalidatePath("/");
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const };
}

export async function setShowCalendar(formData: FormData) {
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  const showCalendar = formData.get("showCalendar") === "on";
  const current = draft.document as { hero: object };
  let document;
  try {
    document = siteDocumentSchema.parse({ ...draft.document, hero: { ...current.hero, showCalendar } });
  } catch {
    return { error: "The calendar could not be updated." };
  }
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const saved = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (saved.error) return { error: saved.error.message };
  const published = await supabase.from("website_versions").select("id, document").eq("tenant_id", context.site.tenantId).eq("status", "published").maybeSingle();
  if (published.error) return { error: published.error.message };
  if (published.data) {
    const publishedHero = (published.data.document as { hero?: object }).hero ?? {};
    let publishedDocument;
    try {
      publishedDocument = siteDocumentSchema.parse({ ...(published.data.document as object), hero: { ...publishedHero, showCalendar } });
    } catch {
      return { error: "The calendar could not be updated." };
    }
    const updated = await supabase.from("website_versions").update({ document: publishedDocument }).eq("id", published.data.id).eq("tenant_id", context.site.tenantId);
    if (updated.error) return { error: updated.error.message };
  }
  updateTag(`tenant-site:${context.site.slug}`);
  revalidatePath("/");
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const };
}

export async function setMaintenance(formData: FormData) {
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  const maintenance = formData.get("maintenance") === "on";
  let document;
  try {
    document = siteDocumentSchema.parse({ ...draft.document, maintenance });
  } catch {
    return { error: "Maintenance could not be updated." };
  }
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const saved = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (saved.error) return { error: saved.error.message };
  const published = await supabase.from("website_versions").select("id, document").eq("tenant_id", context.site.tenantId).eq("status", "published").maybeSingle();
  if (published.error) return { error: published.error.message };
  if (published.data) {
    let publishedDocument;
    try {
      publishedDocument = siteDocumentSchema.parse({ ...(published.data.document as object), maintenance });
    } catch {
      return { error: "Maintenance could not be updated." };
    }
    const updated = await supabase.from("website_versions").update({ document: publishedDocument }).eq("id", published.data.id).eq("tenant_id", context.site.tenantId);
    if (updated.error) return { error: updated.error.message };
  }
  updateTag(`tenant-site:${context.site.slug}`);
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/services");
  revalidatePath("/contact");
  revalidatePath("/book");
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const };
}

const navPages = ["services", "about", "contact", "appointments"] as const;

export async function saveNavigation(formData: FormData) {
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  const selected = formData.getAll("nav").map(String).filter((item): item is (typeof navPages)[number] => navPages.includes(item as (typeof navPages)[number]));
  const pageIds = formData.getAll("pageId").map(String);
  const pageLabels = formData.getAll("pageLabel").map(String);
  const pageBodies = formData.getAll("pageBody").map(String);
  const pageForms = formData.getAll("pageForm").map(String);
  const pages = pageIds.flatMap((id, index) => {
    if (!/^c[a-z0-9]{8}$/.test(id)) return [];
    const page: { id: string; label: string; body: string; form?: unknown } = {
      id,
      label: (pageLabels[index] ?? "").slice(0, 40),
      body: (pageBodies[index] ?? "").slice(0, 4000),
    };
    const raw = pageForms[index];
    if (raw) {
      try {
        page.form = JSON.parse(raw);
      } catch {
        page.form = raw;
      }
    }
    return [page];
  }).slice(0, 5);
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const order = formData.getAll("order").map(String);
  const seen = new Set<string>();
  const navigation: Array<(typeof navPages)[number] | { id: string; label: string; body: string; form?: unknown }> = [];
  for (const id of order.length ? order : [...selected, ...pages.map((page) => page.id)]) {
    if (seen.has(id) || navigation.length >= 8) continue;
    seen.add(id);
    if (navPages.includes(id as (typeof navPages)[number]) && selected.includes(id as (typeof navPages)[number])) navigation.push(id as (typeof navPages)[number]);
    else {
      const page = pagesById.get(id);
      if (page) navigation.push(page);
    }
  }
  const current = draft.document as { sections: Array<"about" | "services" | "gallery" | "testimonials" | "faqs"> };
  const rest = current.sections.filter((item) => item !== "about" && item !== "services");
  const sections = [
    ...(selected.includes("about") ? ["about" as const] : []),
    ...(selected.includes("services") ? ["services" as const] : []),
    ...rest,
  ];
  const navLabels = {
    services: String(formData.get("labelServices") ?? "").trim().slice(0, 40),
    about: String(formData.get("labelAbout") ?? "").trim().slice(0, 40),
    contact: String(formData.get("labelContact") ?? "").trim().slice(0, 40),
  };
  let document;
  try {
    document = siteDocumentSchema.parse({ ...draft.document, navigation, sections, navLabels });
  } catch {
    return { error: "Check the page name and each form field." };
  }
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const { error } = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const };
}

export async function saveAboutPage(formData: FormData) {
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  const current = draft.document as { about: object };
  const document = siteDocumentSchema.parse({ ...draft.document, about: { ...current.about, body: String(formData.get("body") ?? ""), visible: true } });
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const { error } = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const };
}

export async function saveContactPage(formData: FormData) {
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  const current = draft.document as { contact: object };
  let document;
  try {
    document = siteDocumentSchema.parse({
      ...draft.document,
      contact: {
        ...current.contact,
        email: String(formData.get("email") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim(),
        address: String(formData.get("address") ?? "").trim(),
        hours: String(formData.get("hours") ?? "").trim(),
      },
    });
  } catch {
    return { error: "Use a valid email address, or leave it blank." };
  }
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const { error } = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const };
}

export async function saveReviewLinks(formData: FormData) {
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  const reviewLinks = {
    google: String(formData.get("google") ?? "").trim(),
    yelp: String(formData.get("yelp") ?? "").trim(),
    facebook: String(formData.get("facebook") ?? "").trim(),
    other: String(formData.get("other") ?? "").trim(),
    googleOn: formData.get("googleOn") === "on",
    yelpOn: formData.get("yelpOn") === "on",
    facebookOn: formData.get("facebookOn") === "on",
    otherOn: formData.get("otherOn") === "on",
  };
  const activeLinks = [reviewLinks.googleOn ? reviewLinks.google : "", reviewLinks.yelpOn ? reviewLinks.yelp : "", reviewLinks.facebookOn ? reviewLinks.facebook : "", reviewLinks.otherOn ? reviewLinks.other : ""].filter(Boolean);
  const current = draft.document as { sections?: Array<"about" | "services" | "gallery" | "testimonials" | "faqs">; testimonials?: Array<{ name?: string; url?: string; avatar?: string }>; reviewSummary?: unknown };
  const imported = await readReviewPages(activeLinks);
  const sections = [...(current.sections ?? [])];
  if ((imported.reviews.length || activeLinks.length > 0) && !sections.includes("testimonials") && sections.length < 5) sections.push("testimonials");
  const testimonials = imported.reviews.length
    ? imported.reviews.map((review) => { const previous = current.testimonials?.find((item) => item.name === review.name); return { quote: review.quote, name: review.name, approved: true, stars: review.stars, date: review.date, url: previous?.url, avatar: previous?.avatar }; })
    : current.testimonials;
  let document;
  try {
    document = siteDocumentSchema.parse({ ...draft.document, reviewLinks, sections, testimonials, reviewSummary: imported.summary ?? current.reviewSummary });
  } catch {
    return { error: "Use a full https address for each review page, or leave it blank." };
  }
  if (!assertNoExecutableContent(document)) return { error: "Website content cannot include scripts." };
  const { error } = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (error) return { error: error.message };
  const published = await supabase.from("website_versions").select("id, document").eq("tenant_id", context.site.tenantId).eq("status", "published").maybeSingle();
  if (published.data) {
    const publishedSections = [...(((published.data.document as { sections?: typeof sections }).sections) ?? [])];
    if (!publishedSections.includes("testimonials") && publishedSections.length < 5 && sections.includes("testimonials")) publishedSections.push("testimonials");
    const publishedDocument = siteDocumentSchema.safeParse({
      ...(published.data.document as object),
      reviewLinks,
      sections: publishedSections,
      testimonials: document.testimonials,
      reviewSummary: document.reviewSummary,
    });
    if (publishedDocument.success) {
      await supabase.from("website_versions").update({ document: publishedDocument.data }).eq("id", published.data.id).eq("tenant_id", context.site.tenantId);
    }
  }
  updateTag(`tenant-site:${context.site.slug}`);
  revalidatePath("/");
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const, imported: imported.reviews.length || document.testimonials.length };
}

export async function setTestimonialsSection(visible: boolean) {
  const ready = await draftForEdit();
  if ("error" in ready) return ready;
  const { context, supabase, draft } = ready;
  function nextSections(document: object) {
    const current = ((document as { sections?: Array<"about" | "services" | "gallery" | "testimonials" | "faqs"> }).sections ?? []).filter((item) => item !== "testimonials");
    return visible ? [...current, "testimonials" as const] : current;
  }
  let document;
  try {
    document = siteDocumentSchema.parse({ ...draft.document, sections: nextSections(draft.document) });
  } catch {
    return { error: "The testimonials section could not be updated." };
  }
  const saved = await supabase.from("website_versions").update({ document }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
  if (saved.error) return { error: saved.error.message };
  const published = await supabase.from("website_versions").select("id, document").eq("tenant_id", context.site.tenantId).eq("status", "published").maybeSingle();
  if (published.data) {
    const publishedDocument = siteDocumentSchema.safeParse({ ...(published.data.document as object), sections: nextSections(published.data.document as object) });
    if (publishedDocument.success) {
      await supabase.from("website_versions").update({ document: publishedDocument.data }).eq("id", published.data.id).eq("tenant_id", context.site.tenantId);
    }
  }
  updateTag(`tenant-site:${context.site.slug}`);
  revalidatePath("/");
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const };
}

export async function saveReviewLinksForm(_prev: { error?: string; ok?: boolean; imported?: number } | null, formData: FormData) {
  const saved = await saveReviewLinks(formData);
  if ("error" in saved && saved.error) return { error: saved.error };
  return { ok: true as const, imported: "imported" in saved ? saved.imported : 0 };
}

export async function saveNavigationForm(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
  const saved = await saveNavigation(formData);
  if ("error" in saved && saved.error) return { error: saved.error };
  return { ok: true as const };
}

export async function saveAboutPageForm(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
  const saved = await saveAboutPage(formData);
  if ("error" in saved && saved.error) return { error: saved.error };
  return { ok: true as const };
}

export async function saveContactPageForm(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
  const saved = await saveContactPage(formData);
  if ("error" in saved && saved.error) return { error: saved.error };
  return { ok: true as const };
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
  const { context, supabase } = await editorDb();
  if (context.viewer.id === MASTER_USER_ID) {
    const { data: draft } = await supabase.from("website_versions").select("id, document, theme").eq("tenant_id", context.site.tenantId).eq("status", "draft").maybeSingle();
    if (!draft) return { error: "There is no draft to publish." };
    const archived = await supabase.from("website_versions").update({ status: "archived" }).eq("tenant_id", context.site.tenantId).eq("status", "published");
    if (archived.error) return { error: archived.error.message };
    const published = await supabase.from("website_versions").update({ status: "published", published_at: new Date().toISOString() }).eq("id", draft.id).eq("tenant_id", context.site.tenantId);
    if (published.error) return { error: published.error.message };
    const latest = await supabase.from("website_versions").select("version").eq("tenant_id", context.site.tenantId).order("version", { ascending: false }).limit(1).maybeSingle();
    const inserted = await supabase.from("website_versions").insert({
      tenant_id: context.site.tenantId,
      version: (latest.data?.version ?? 0) + 1,
      status: "draft",
      document: draft.document,
      theme: draft.theme,
      created_by: context.viewer.id,
      parent_version_id: draft.id,
    });
    if (inserted.error) return { error: inserted.error.message };
  } else {
    const { data } = await supabase.rpc("publish_website", { p_tenant_id: context.site.tenantId });
    if (data && typeof data === "object" && "error" in data && data.error) return { error: String(data.error) };
  }
  updateTag(`tenant-site:${context.site.slug}`);
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings/website");
  return { ok: true as const };
}

export async function publishWebsiteForm(_prev: { error?: string } | null, formData: FormData) {
  try {
    const logo = await saveLogo(formData);
    if ("error" in logo && logo.error) return { error: logo.error };
    const hero = await saveHeroSection(formData);
    if ("error" in hero && hero.error) return { error: hero.error };
    const navigation = await saveNavigation(formData);
    if ("error" in navigation && navigation.error) return { error: navigation.error };
    const about = await saveAboutPage(formData);
    if ("error" in about && about.error) return { error: about.error };
    const contact = await saveContactPage(formData);
    if ("error" in contact && contact.error) return { error: contact.error };
    const reviews = await saveReviewLinks(formData);
    if ("error" in reviews && reviews.error) return { error: reviews.error };
    const theme = await saveTheme(formData);
    if ("error" in theme && theme.error) return { error: theme.error };
    const published = await publishWebsite();
    if ("error" in published && published.error) return { error: published.error };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not publish." };
  }
  redirect("/dashboard/settings/website?published=1");
}

export async function markAlertsSeen() {
  const { site } = await requireMember();
  const jar = await cookies();
  jar.set("overdrive_alerts_seen", JSON.stringify({ tenantId: site.tenantId, at: new Date().toISOString() }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearActivityForm() {
  const { site } = await requireMember();
  const jar = await cookies();
  jar.set("overdrive_activity_cleared", JSON.stringify({ tenantId: site.tenantId, at: new Date().toISOString() }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/dashboard");
}

export async function rollbackWebsite(formData: FormData) {
  const { context, supabase } = await clientForTenant();
  const { data } = await supabase.rpc("rollback_website", { p_tenant_id: context.site.tenantId, p_version_id: String(formData.get("versionId")) });
  updateTag(`tenant-site:${context.site.slug}`);
  return data as { ok?: boolean; error?: string };
}

export async function saveSupportForm(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
  const { context } = await editorDb();
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Add a message." };
  if (message.length > 2000) return { error: "That message is too long." };
  const saved = await createAdminClient().from("submissions").insert({
    tenant_id: context.site.tenantId,
    kind: "support",
    answers: { message },
    status: "unread",
    customer_email: context.viewer.email,
  });
  if (saved.error) return { error: saved.error.message };
  revalidatePath("/dashboard/support");
  revalidatePath("/dashboard/submissions");
  return { ok: true as const };
}

export async function saveContactFormFields(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
  const { context, supabase } = await editorDb();
  if (context.viewer.role === "staff") return { error: "Staff cannot edit forms." };
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("fields") ?? ""));
  } catch {
    return { error: "Could not read the form fields." };
  }
  const parsed = formSchema.safeParse({ fields: raw });
  if (!parsed.success) return { error: "Check each field label and type." };
  const ids = new Set<string>();
  for (const field of parsed.data.fields) {
    if (ids.has(field.id)) return { error: "Each field needs its own name." };
    ids.add(field.id);
    if (field.type === "select" && (field.options?.length ?? 0) < 2) return { error: "A select field needs at least two options." };
  }
  const existing = await supabase.from("form_definitions").select("id").eq("tenant_id", context.site.tenantId).eq("kind", "contact").eq("active", true).limit(1).maybeSingle();
  if (existing.error) return { error: existing.error.message };
  let formId = existing.data?.id;
  if (!formId) {
    const created = await supabase.from("form_definitions").insert({ tenant_id: context.site.tenantId, kind: "contact", name: "contact" }).select("id").single();
    if (created.error || !created.data) return { error: created.error?.message ?? "Could not save the form." };
    formId = created.data.id;
  }
  const latest = await supabase.from("form_versions").select("version").eq("form_id", formId).order("version", { ascending: false }).limit(1).maybeSingle();
  const saved = await supabase.from("form_versions").insert({
    tenant_id: context.site.tenantId,
    form_id: formId,
    version: (latest.data?.version ?? 0) + 1,
    schema: parsed.data,
  });
  if (saved.error) return { error: saved.error.message };
  revalidatePath("/dashboard/settings/website");
  revalidatePath("/");
  revalidatePath("/contact");
  return { ok: true as const };
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

export async function saveNotificationsForm(formData: FormData) {
  await saveNotifications(formData);
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
