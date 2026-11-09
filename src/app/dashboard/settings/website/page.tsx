import { WebsiteEditor, type WebsiteFields } from "@/components/dashboard/website-editor";
import type { CatalogDay, CatalogService, CatalogStaff } from "@/components/dashboard/service-page-settings";
import type { SiteNavItem } from "@/lib/site/types";
import { translator } from "@/lib/i18n/server";
import { ensureWebsiteDraft } from "@/server/dashboard-actions";
import { requireMember } from "@/server/guards";
import { MASTER_USER_ID } from "@/lib/auth/master";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { themePresetsSchema, themeSchema } from "@/lib/content/schema";
import type { ThemePalette } from "@/lib/theme/tokens";
import { DateTime } from "luxon";
import { connection } from "next/server";

export default async function Page({ searchParams }: { searchParams: Promise<{ published?: string }> }) {
  const query = await searchParams;
  const t = await translator();
  const { site, viewer } = await requireMember();
  await connection();
  const today = DateTime.now().setZone(site.timezone).toISODate() ?? "";
  const supabase = viewer.id === MASTER_USER_ID ? createAdminClient() : await createClient();
  const draft = site.databaseReady ? await ensureWebsiteDraft(supabase, site.tenantId, viewer.id) : null;
  const document = (draft?.document ?? null) as {
    identity?: { name?: string; category?: string; logoUrl?: string; logoInFooter?: boolean };
    hero?: { imageUrl?: string; landingImageUrl?: string; backgroundOpacity?: number; showCalendar?: boolean; showPortrait?: boolean };
    about?: { short?: string; body?: string; companyBio?: string };
    contact?: { email?: string; phone?: string; address?: string; hours?: string };
    navigation?: SiteNavItem[];
    reviewLinks?: { google?: string; yelp?: string; facebook?: string; other?: string; googleOn?: boolean; yelpOn?: boolean; facebookOn?: boolean; otherOn?: boolean };
    navLabels?: { services?: string; about?: string; contact?: string; appointments?: string };
    maintenance?: boolean;
    themePresets?: unknown;
  } | null;
  const fields: WebsiteFields = {
    name: document?.identity?.name || site.name,
    category: document?.identity?.category || site.category,
    aboutShort: document?.about?.short || site.about.short,
    aboutBody: document?.about?.body || site.about.body,
    companyBio: document?.about?.companyBio || site.about.companyBio,
    logoUrl: document?.identity?.logoUrl || site.logoUrl,
    logoInFooter: document?.identity?.logoInFooter ?? site.logoInFooter,
    maintenance: document?.maintenance ?? site.maintenance,
    portraitUrl: document?.hero?.imageUrl || site.hero.imageUrl,
    landingUrl: document?.hero?.landingImageUrl || site.hero.landingImageUrl,
    backgroundOpacity: document?.hero?.backgroundOpacity ?? site.hero.backgroundOpacity,
    showCalendar: document?.hero?.showCalendar ?? site.hero.showCalendar,
    showPortrait: document?.hero?.showPortrait ?? site.hero.showPortrait,
    navigation: document?.navigation ?? site.navigation,
    email: document?.contact?.email || site.contact.email,
    phone: document?.contact?.phone || site.contact.phone,
    address: document?.contact?.address || site.contact.address,
    hours: document?.contact?.hours || site.contact.hours,
    navLabels: {
      services: document?.navLabels?.services ?? site.navLabels.services,
      about: document?.navLabels?.about ?? site.navLabels.about,
      contact: document?.navLabels?.contact ?? site.navLabels.contact,
      appointments: document?.navLabels?.appointments ?? site.navLabels.appointments,
    },
    theme: themeFields(themeSchema.safeParse(draft?.theme).data ?? site.theme),
    themePresets: themePresetsSchema.safeParse(document?.themePresets).data ?? [],
    reviewLinks: {
      google: document?.reviewLinks?.google ?? site.reviewLinks.google,
      yelp: document?.reviewLinks?.yelp ?? site.reviewLinks.yelp,
      facebook: document?.reviewLinks?.facebook ?? site.reviewLinks.facebook,
      other: document?.reviewLinks?.other ?? site.reviewLinks.other,
      googleOn: document?.reviewLinks?.googleOn ?? Boolean(document?.reviewLinks?.google ?? site.reviewLinks.google),
      yelpOn: document?.reviewLinks?.yelpOn ?? Boolean(document?.reviewLinks?.yelp ?? site.reviewLinks.yelp),
      facebookOn: document?.reviewLinks?.facebookOn ?? Boolean(document?.reviewLinks?.facebook ?? site.reviewLinks.facebook),
      otherOn: document?.reviewLinks?.otherOn ?? Boolean(document?.reviewLinks?.other ?? site.reviewLinks.other),
    },
  };
  if (!site.databaseReady || !draft) return <p className="text-sm text-muted">{t("dash.noDraft")}</p>;
  const [serviceRows, staffRows, hourRows, linkRows] = await Promise.all([
    supabase.from("services").select("id, name, duration_minutes, price_cents").eq("tenant_id", site.tenantId).is("archived_at", null).order("sort_order"),
    supabase.from("staff").select("id, display_name, active").eq("tenant_id", site.tenantId).is("archived_at", null).order("display_name"),
    supabase.from("working_hours").select("staff_id, weekday, start_minute, end_minute").eq("tenant_id", site.tenantId),
    supabase.from("staff_services").select("staff_id, service_id").eq("tenant_id", site.tenantId),
  ]);
  const services: CatalogService[] = (serviceRows.data ?? []).map((service) => ({
    id: service.id,
    name: service.name,
    durationMinutes: service.duration_minutes,
    priceCents: service.price_cents,
    staffIds: (linkRows.data ?? []).filter((link) => link.service_id === service.id).map((link) => link.staff_id),
  }));
  const staff: CatalogStaff[] = (staffRows.data ?? []).map((person) => ({ id: person.id, name: person.display_name, active: person.active }));
  const firstStaff = staff[0]?.id;
  const matched = (hourRows.data ?? []).filter((row) => row.staff_id === firstStaff);
  const hours = matched.length ? matched : (hourRows.data ?? []);
  const days: CatalogDay[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    const row = hours.find((item) => item.weekday === weekday);
    const start = row ? minuteLabel(row.start_minute) : "09:00";
    const end = row ? minuteLabel(row.end_minute) : "17:00";
    const open = hours.length ? Boolean(row) : weekday > 0 && weekday < 6;
    return { weekday, open, start, end };
  });
  return <WebsiteEditor fields={fields} published={query.published === "1"} site={site} today={today} catalog={{ services, staff, days }} />;

function themeFields(theme: { primary: string; secondary: string; background: string; foreground: string; font: ThemePalette["font"]; mode?: ThemePalette["mode"] }): ThemePalette {
  return { primary: theme.primary, secondary: theme.secondary, background: theme.background, foreground: theme.foreground, font: theme.font, mode: theme.mode ?? "light" };
}

function minuteLabel(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
}
