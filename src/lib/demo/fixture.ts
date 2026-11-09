import { defaultContactFields } from "@/lib/forms/validate";
import type { PublicSite } from "@/lib/site/types";
import { referenceTheme, type ThemeTokens } from "@/lib/theme/tokens";

const weekday = [1, 2, 3, 4, 5];

function hours(start = 9 * 60, end = 17 * 60) {
  return weekday.map((day) => ({ weekday: day, startMinute: start, endMinute: end }));
}

export function demoStudio(): PublicSite {
  return site({
    tenantId: "55555555-5555-4555-8555-555555555555",
    slug: "demo-studio",
    name: "Northline Studio",
    category: "Hair studio",
    tagline: "Cuts, color, and calm appointments.",
    theme: referenceTheme,
    services: [
      service("11111111-1111-4111-8111-111111111111", "Cut and style", "A scheduled cut with a finish.", 60, 8500),
      service("22222222-2222-4222-8222-222222222222", "Color appointment", "A single-process color visit.", 90, 16000),
    ],
  });
}

export function demoOffice(): PublicSite {
  return site({
    tenantId: "66666666-6666-4666-8666-666666666666",
    slug: "demo-office",
    name: "Harbor Office",
    category: "Consulting",
    tagline: "Introductory calls by appointment.",
    theme: { ...referenceTheme, primary: "#00595b", secondary: "#111111" },
    services: [service("77777777-7777-4777-8777-777777777777", "Intro call", "A 45-minute working session.", 45, 0, false)],
  });
}

export function sampleSite(slug: string) {
  if (slug === "demo-studio") return demoStudio();
  if (slug === "demo-office") return demoOffice();
  return null;
}

function site(input: { tenantId: string; slug: string; name: string; category: string; tagline: string; theme: ThemeTokens; services: PublicSite["services"] }): PublicSite {
  const staffId = input.slug === "demo-office" ? "99999999-9999-4999-8999-999999999999" : "33333333-3333-4333-8333-333333333333";
  return {
    tenantId: input.tenantId,
    slug: input.slug,
    timezone: "America/New_York",
    isDemo: true,
    databaseReady: false,
    theme: input.theme,
    name: input.name,
    category: input.category,
    tagline: input.tagline,
    logoUrl: "",
    logoInFooter: false,
    maintenance: false,
    hero: {
      imageUrl: "/portrait.jpg",
      landingImageUrl: "/hero-landing.jpg",
      title: input.name,
      subtitle: input.tagline,
      cta: "Book an Appointment",
      alt: "",
      focalX: 50,
      focalY: 40,
      backgroundOpacity: 25,
      showCalendar: true,
      showPortrait: true,
    },
    about: {
      visible: true,
      short: "Sample copy for layout preview. Replace it from the website editor after this business is provisioned.",
      body: "This paragraph is placeholder copy for the sample business. It is not a claim about a real company.",
      companyBio: "",
      professionalBio: "",
    },
    contact: {
      email: "hello@example.com",
      phone: "(212) 555-0100",
      address: "100 Example Street, New York, NY",
      mapUrl: "",
      hours: "Tue–Fri, 9:00–5:00",
      socials: [
        { label: "Instagram", href: "https://instagram.com" },
        { label: "Facebook", href: "https://facebook.com" },
        { label: "TikTok", href: "https://www.tiktok.com" },
      ],
    },
    contactForm: defaultContactFields,
    facts: [
      { label: "Studio", value: "By appointment" },
      { label: "Languages", value: "English" },
    ],
    sections: ["about", "services", "testimonials"],
    navigation: ["services", "about", "contact"],
    navLabels: { services: "", about: "", contact: "", appointments: "" },
    gallery: [],
    testimonials: [],
    reviewLinks: { google: "", yelp: "", facebook: "", other: "" },
    faqs: [{ question: "How do I change this text?", answer: "Publish a website version from the dashboard. Empty optional sections stay hidden." }],
    services: input.services,
    staff: [
      {
        id: staffId,
        name: input.slug === "demo-office" ? "Sample consultant" : "Sample stylist",
        timezone: "America/New_York",
        serviceIds: input.services.map((item) => item.id),
        hours: hours(),
        overrides: [],
      },
    ],
    policies: [],
    booking: {
      horizonDays: 45,
      minNoticeMinutes: 120,
      slotIntervalMinutes: 30,
      cancellationCutoffMinutes: 1440,
      rescheduleCutoffMinutes: 1440,
    },
    seo: { title: input.name, description: input.tagline, imageUrl: "", indexable: false },
    closedDates: [],
  };
}

function service(id: string, name: string, description: string, durationMinutes: number, priceCents: number, showPrice = true): PublicSite["services"][number] {
  return {
    id,
    name,
    description,
    durationMinutes,
    priceCents: showPrice ? priceCents : null,
    showPrice,
    bufferBefore: 0,
    bufferAfter: 0,
    location: "In studio",
  };
}
