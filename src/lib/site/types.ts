import type { DateOverride, HoursWindow } from "@/lib/availability/slots";
import type { FormField } from "@/lib/forms/validate";
import type { ThemeTokens } from "@/lib/theme/tokens";

export type PublicService = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number | null;
  showPrice: boolean;
  bufferBefore: number;
  bufferAfter: number;
  location: string;
};

export type PublicStaff = {
  id: string;
  name: string;
  timezone: string;
  serviceIds: string[];
  hours: HoursWindow[];
  overrides: DateOverride[];
};

export type PublicPolicy = {
  documentId: string;
  versionId: string;
  slug: string;
  title: string;
  body: string;
  downloadUrl: string | null;
  requiredForBooking: boolean;
  effectiveOn: string | null;
};

export type BuiltInNav = "services" | "about" | "contact" | "appointments";
export type CustomNavPage = { id: string; label: string; body: string; form?: FormField[] };
export type SiteNavItem = BuiltInNav | CustomNavPage;

export function menuEntries(navigation: SiteNavItem[], labels: Record<BuiltInNav, string>) {
  return navigation.map((item) => typeof item === "string" ? { id: item, label: labels[item] } : { id: item.id, label: item.label });
}

export type PublicSite = {
  tenantId: string;
  slug: string;
  timezone: string;
  isDemo: boolean;
  databaseReady: boolean;
  theme: ThemeTokens;
  name: string;
  category: string;
  tagline: string;
  logoUrl: string;
  logoInFooter: boolean;
  maintenance: boolean;
  hero: {
    imageUrl: string;
    landingImageUrl: string;
    title: string;
    subtitle: string;
    cta: string;
    alt: string;
    focalX: number;
    focalY: number;
    backgroundOpacity: number;
    showCalendar: boolean;
    showPortrait: boolean;
  };
  about: { body: string; companyBio: string; professionalBio: string; short: string; visible: boolean };
  contact: { email: string; phone: string; address: string; mapUrl: string; hours: string; socials: { label: string; href: string }[] };
  contactForm: FormField[];
  facts: { label: string; value: string }[];
  sections: Array<"about" | "services" | "gallery" | "testimonials" | "faqs">;
  navigation: SiteNavItem[];
  navLabels: Record<BuiltInNav, string>;
  gallery: { src: string; alt: string }[];
  testimonials: { quote: string; name: string; approved: boolean; stars?: number; date?: string; url?: string; avatar?: string }[];
  reviewSummary?: { rating: number; count: number; label: string };
  reviewLinks: { google: string; yelp: string; facebook: string; other: string };
  faqs: { question: string; answer: string }[];
  services: PublicService[];
  staff: PublicStaff[];
  policies: PublicPolicy[];
  booking: {
    horizonDays: number;
    minNoticeMinutes: number;
    slotIntervalMinutes: number;
    cancellationCutoffMinutes: number;
    rescheduleCutoffMinutes: number;
  };
  seo: { title: string; description: string; imageUrl: string; indexable: boolean };
  closedDates: string[];
};
