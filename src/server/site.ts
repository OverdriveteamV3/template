import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { sampleSite } from "@/lib/demo/fixture";
import { siteDocumentSchema, themeSchema, type SiteDocument, type ThemeDocument } from "@/lib/content/schema";
import type { PublicSite, PublicPolicy, PublicService, PublicStaff } from "@/lib/site/types";
import { masterViewer } from "@/lib/auth/master";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { referenceTheme } from "@/lib/theme/tokens";
import { hostConfigFromEnv, resolveHost, type HostDecision } from "@/lib/tenant/host";

export type Viewer = {
  id: string;
  email: string;
  emailConfirmed: boolean;
  role: "owner" | "admin" | "staff" | null;
  isPlatformAdmin: boolean;
};

export type RequestContext =
  | { kind: "platform"; host: string; viewer: Viewer | null }
  | { kind: "site"; host: string; site: PublicSite; viewer: Viewer | null; preview: boolean }
  | { kind: "unknown"; host: string };

export const getRequestContext = cache(async function getRequestContext(): Promise<RequestContext> {
  const host = (await headers()).get("host") ?? "";
  const decision = resolveHost(host, hostConfigFromEnv());
  const viewer = await loadViewer();
  if (decision.kind === "platform") return { kind: "platform", host, viewer };
  if (decision.kind === "unknown") return { kind: "unknown", host };

  const slug = await slugForDecision(decision);
  if (!slug) return { kind: "unknown", host };
  if (decision.kind === "custom" && decision.lockedSlug && slug !== decision.lockedSlug) {
    return { kind: "unknown", host };
  }

  if (!isSupabaseConfigured()) {
    const sample = sampleSite(slug);
    if (!sample) return { kind: "unknown", host };
    return { kind: "site", host, site: sample, viewer, preview: false };
  }

  const supabase = await createClient();
  const preview = await previewVersion();
  const { data, error } = preview
    ? { data: null, error: null }
    : await supabase.rpc("get_public_site", { p_slug: slug });
  if (error) return { kind: "unknown", host };
  const payload = preview ?? data;
  if (!payload) return { kind: "unknown", host };
  const site = mapPayload(payload as Record<string, unknown>, true);
  if (!site || (decision.kind === "slug" && site.slug !== slug)) return { kind: "unknown", host };
  if (viewer) viewer.role = await membershipRole(site.tenantId, viewer.id);
  return { kind: "site", host, site, viewer, preview: Boolean(preview) };
});

async function slugForDecision(decision: HostDecision) {
  if (decision.kind === "slug") return decision.slug;
  if (decision.kind !== "custom") return null;
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("resolve_public_host", { p_host: decision.hostname });
  return typeof data === "string" ? data : null;
}

async function loadViewer(): Promise<Viewer | null> {
  if (!isSupabaseConfigured()) return masterViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const { data: account } = await supabase.rpc("current_account");
  const row = Array.isArray(account) ? account[0] : account;
  const email = row?.email ?? String(data.claims.email ?? "");
  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", data.claims.sub).maybeSingle();
  return {
    id: data.claims.sub,
    email,
    emailConfirmed: Boolean(row?.email_confirmed),
    role: null,
    isPlatformAdmin: Boolean(admin),
  };
}

async function membershipRole(tenantId: string, userId: string): Promise<Viewer["role"]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  const role = data?.role;
  return role === "owner" || role === "admin" || role === "staff" ? role : null;
}

async function previewVersion() {
  const cookie = (await headers()).get("cookie") ?? "";
  const match = cookie.match(/(?:^|; )od_preview=([^;]+)/);
  if (!match) return null;
  const { verifyPayload } = await import("@/lib/security/tokens");
  const token = verifyPayload<{ versionId: string; tenantId: string; host: string; exp: number }>(decodeURIComponent(match[1]), "PREVIEW_TOKEN_SECRET");
  const host = (await headers()).get("host") ?? "";
  if (!token || token.exp < Date.now() || token.host !== host) return null;
  if (!process.env.SUPABASE_SECRET_KEY) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin.from("website_versions").select("document, theme, tenant_id").eq("id", token.versionId).eq("tenant_id", token.tenantId).maybeSingle();
  if (!data) return null;
  const { data: tenant } = await admin.from("tenants").select("id, slug, timezone, is_demo, name, category, status").eq("id", token.tenantId).maybeSingle();
  if (!tenant || tenant.status === "suspended") return null;
  const published = await admin.rpc("get_public_site", { p_slug: tenant.slug });
  const base = (published.data ?? {}) as Record<string, unknown>;
  return { ...base, tenantId: tenant.id, slug: tenant.slug, timezone: tenant.timezone, isDemo: tenant.is_demo, name: tenant.name, category: tenant.category, document: data.document, theme: data.theme };
}

export function mapPayload(payload: Record<string, unknown>, databaseReady: boolean): PublicSite | null {
  const documentResult = siteDocumentSchema.safeParse(payload.document);
  const themeResult = themeSchema.safeParse(payload.theme);
  if (!documentResult.success) return null;
  const document = documentResult.data;
  const theme = themeResult.success ? themeResult.data : referenceTheme;
  const booking = (payload.booking ?? {}) as PublicSite["booking"];
  return {
    tenantId: String(payload.tenantId),
    slug: String(payload.slug),
    timezone: String(payload.timezone),
    isDemo: Boolean(payload.isDemo),
    databaseReady,
    theme,
    name: document.identity.name || String(payload.name ?? ""),
    category: document.identity.category || String(payload.category ?? ""),
    tagline: document.identity.tagline,
    logoUrl: document.identity.logoUrl ?? "",
    hero: {
      imageUrl: document.hero.imageUrl ?? "",
      landingImageUrl: document.hero.landingImageUrl ?? "",
      title: document.hero.title,
      subtitle: document.hero.subtitle,
      cta: document.hero.cta || "Book an Appointment",
      alt: document.hero.alt,
      focalX: document.hero.focalX,
      focalY: document.hero.focalY,
    },
    about: document.about,
    contact: { ...document.contact, mapUrl: document.contact.mapUrl ?? "" },
    facts: document.facts,
    sections: document.sections,
    gallery: document.gallery,
    testimonials: document.testimonials.filter((item) => item.approved),
    faqs: document.faqs,
    services: (payload.services as PublicService[]) ?? [],
    staff: ((payload.staff as PublicStaff[]) ?? []).map((person) => ({
      ...person,
      overrides: person.overrides ?? [],
      hours: person.hours ?? [],
      serviceIds: person.serviceIds ?? [],
    })),
    policies: ((payload.policies as PublicPolicy[]) ?? []).map((policy) => ({ ...policy, downloadUrl: policy.downloadUrl ?? null })),
    booking: {
      horizonDays: booking.horizonDays ?? 60,
      minNoticeMinutes: booking.minNoticeMinutes ?? 120,
      slotIntervalMinutes: booking.slotIntervalMinutes ?? 30,
      cancellationCutoffMinutes: booking.cancellationCutoffMinutes ?? 1440,
      rescheduleCutoffMinutes: booking.rescheduleCutoffMinutes ?? 1440,
    },
    seo: document.seo,
    closedDates: ((payload.closedDates as string[]) ?? []).map(String),
  };
}

export function emptyDocument(name: string, category: string, tagline: string): SiteDocument {
  return {
    identity: { name, category, tagline, logoUrl: "", logoDarkUrl: "", faviconUrl: "" },
    hero: { imageUrl: "", landingImageUrl: "", profileUrl: "", title: name, subtitle: tagline, cta: "Book an Appointment", alt: "", focalX: 50, focalY: 40 },
    about: { body: "", companyBio: "", professionalBio: "", short: tagline, visible: true },
    contact: { email: "", phone: "", address: "", mapUrl: "", hours: "", socials: [] },
    facts: [],
    sections: ["about", "services"],
    gallery: [],
    testimonials: [],
    faqs: [],
    seo: { title: name, description: tagline, imageUrl: "", indexable: false },
  };
}

export function defaultTheme(): ThemeDocument {
  return referenceTheme;
}
