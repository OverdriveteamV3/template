import { WebsiteEditor, type WebsiteFields } from "@/components/dashboard/website-editor";
import { translator } from "@/lib/i18n/server";
import type { PublicSite } from "@/lib/site/types";
import { requireMember } from "@/server/guards";
import { createClient } from "@/lib/supabase/server";

function fieldsFromSite(site: PublicSite): WebsiteFields {
  return {
    name: site.name,
    category: site.category,
    tagline: site.tagline,
    aboutShort: site.about.short,
    companyBio: site.about.companyBio,
    aboutVisible: site.about.visible,
    email: site.contact.email,
    phone: site.contact.phone,
    address: site.contact.address,
    hours: site.contact.hours,
    socials: site.contact.socials,
    logoUrl: site.logoUrl,
    portraitUrl: site.hero.imageUrl,
    landingUrl: site.hero.landingImageUrl,
    theme: {
      primary: site.theme.primary,
      secondary: site.theme.secondary,
      background: site.theme.background,
      surface: site.theme.surface,
      foreground: site.theme.foreground,
      muted: site.theme.muted,
      border: site.theme.border,
    },
    seoTitle: site.seo.title,
    seoDescription: site.seo.description,
    indexable: site.seo.indexable,
  };
}

export default async function Page() {
  const t = await translator();
  const { site } = await requireMember();
  if (!site.databaseReady) {
    return <WebsiteEditor t={t} fields={fieldsFromSite(site)} editable={false} policies={site.policies} archived={[]} />;
  }
  const supabase = await createClient();
  const [{ data: draft }, { data: archived }] = await Promise.all([
    supabase.from("website_versions").select("id, document, theme").eq("tenant_id", site.tenantId).eq("status", "draft").maybeSingle(),
    supabase.from("website_versions").select("id, version").eq("tenant_id", site.tenantId).eq("status", "archived").order("version", { ascending: false }).limit(5),
  ]);
  if (!draft) return <p>{t("dash.noDraft")}</p>;
  const document = draft.document as {
    identity: { name: string; category: string; tagline: string; logoUrl?: string };
    hero?: { imageUrl?: string; landingImageUrl?: string };
    about: { short: string; companyBio?: string; visible?: boolean };
    contact: { email: string; phone: string; address: string; hours: string; socials?: { label: string; href: string }[] };
    seo: { title: string; description: string; indexable: boolean };
  };
  const theme = draft.theme as WebsiteFields["theme"];
  const fields: WebsiteFields = {
    name: document.identity.name,
    category: document.identity.category,
    tagline: document.identity.tagline,
    aboutShort: document.about.short,
    companyBio: document.about.companyBio ?? "",
    aboutVisible: document.about.visible !== false,
    email: document.contact.email,
    phone: document.contact.phone,
    address: document.contact.address,
    hours: document.contact.hours,
    socials: document.contact.socials ?? [],
    logoUrl: document.identity.logoUrl ?? "",
    portraitUrl: document.hero?.imageUrl ?? "",
    landingUrl: document.hero?.landingImageUrl ?? "",
    theme,
    seoTitle: document.seo.title,
    seoDescription: document.seo.description,
    indexable: document.seo.indexable,
  };
  return <WebsiteEditor t={t} fields={fields} editable policies={site.policies} archived={archived ?? []} />;
}
