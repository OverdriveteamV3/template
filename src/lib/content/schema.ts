import { z } from "zod";
import { fieldSchema } from "@/lib/forms/validate";
import { buttonPresets, densityPresets, fontPresets, radiusPresets } from "@/lib/theme/tokens";

const hex = z.string().regex(/^#([\da-f]{6})$/i);
const safeText = z.string().trim().max(4000);
const link = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || /^(https?:\/\/|mailto:)/i.test(value), "Use an http, https, or mailto link.");
const imageAddress = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || (/^(https?:\/\/|\/(?!\/))/i.test(value) && !value.includes("..")), "Use an image address.");

export const themePresetSchema = z.object({
  name: safeText.min(1).max(40),
  primary: hex,
  secondary: hex,
  background: hex,
  foreground: hex,
  font: z.enum(fontPresets),
  mode: z.enum(["light", "dark"]),
});

export const themePresetsSchema = z.array(themePresetSchema).max(12);
export type ThemePreset = z.infer<typeof themePresetSchema>;

export const themeSchema = z.object({
  background: hex,
  surface: hex,
  foreground: hex,
  muted: hex,
  border: hex,
  primary: hex,
  secondary: hex,
  font: z.enum(fontPresets),
  mode: z.enum(["light", "dark"]).default("light"),
  density: z.enum(densityPresets),
  radius: z.enum(radiusPresets),
  button: z.enum(buttonPresets),
  layout: z.literal("reference"),
});

export const siteDocumentSchema = z.object({
  identity: z.object({
    name: safeText.max(120),
    category: safeText.max(80),
    tagline: safeText.max(180),
    logoUrl: imageAddress.optional(),
    logoInFooter: z.boolean().optional(),
    logoDarkUrl: link.or(z.literal("")).optional(),
    faviconUrl: link.or(z.literal("")).optional(),
  }),
  hero: z.object({
    imageUrl: imageAddress.optional(),
    landingImageUrl: z.string().trim().max(500).refine((value) => value === "" || (/^(https?:\/\/|\/(?!\/))/i.test(value) && !value.includes("..")), "Use an image address.").optional(),
    profileUrl: link.or(z.literal("")).optional(),
    title: safeText.max(160),
    subtitle: safeText.max(240),
    cta: safeText.max(40),
    alt: safeText.max(180),
    focalX: z.number().min(0).max(100),
    focalY: z.number().min(0).max(100),
    backgroundOpacity: z.number().min(0).max(100).optional(),
    showCalendar: z.boolean().optional(),
    showPortrait: z.boolean().optional(),
  }),
  about: z.object({
    body: safeText,
    companyBio: safeText,
    professionalBio: safeText,
    short: safeText.max(400),
    visible: z.boolean(),
  }),
  contact: z.object({
    email: z.union([z.email(), z.literal("")]),
    phone: safeText.max(40),
    address: safeText.max(240),
    mapUrl: link.or(z.literal("")),
    hours: safeText.max(240),
    socials: z.array(z.object({ label: safeText.max(40), href: link })).max(8),
  }),
  facts: z.array(z.object({ label: safeText.max(60), value: safeText.max(120) })).max(8),
  sections: z.array(z.enum(["about", "services", "gallery", "testimonials", "faqs"])).max(5),
  navLabels: z.object({
    services: safeText.max(40).optional(),
    about: safeText.max(40).optional(),
    contact: safeText.max(40).optional(),
    appointments: safeText.max(40).optional(),
  }).optional(),
  navigation: z.array(z.union([
    z.enum(["services", "about", "contact", "appointments"]),
    z.object({
      id: z.string().regex(/^c[a-z0-9]{8}$/),
      label: safeText.max(40),
      body: safeText.max(4000),
      form: z.array(fieldSchema).min(1).max(20).optional(),
    }),
  ])).max(8).optional(),
  gallery: z.array(z.object({ src: link, alt: safeText.max(180) })).max(12),
  testimonials: z.array(z.object({
    quote: safeText.max(600),
    name: safeText.max(80),
    approved: z.boolean(),
    stars: z.number().int().min(1).max(5).optional(),
    date: safeText.max(40).optional(),
    url: link.optional(),
    avatar: link.optional(),
  })).max(12),
  reviewSummary: z.object({
    rating: z.number().min(0).max(5),
    count: z.number().int().min(0),
    label: safeText.max(80),
  }).optional(),
  reviewLinks: z.object({
    google: link.or(z.literal("")).optional(),
    yelp: link.or(z.literal("")).optional(),
    facebook: link.or(z.literal("")).optional(),
    other: link.or(z.literal("")).optional(),
    googleOn: z.boolean().optional(),
    yelpOn: z.boolean().optional(),
    facebookOn: z.boolean().optional(),
    otherOn: z.boolean().optional(),
  }).optional(),
  faqs: z.array(z.object({ question: safeText.max(180), answer: safeText.max(800) })).max(20),
  seo: z.object({
    title: safeText.max(70),
    description: safeText.max(180),
    imageUrl: link.or(z.literal("")),
    indexable: z.boolean(),
  }),
  maintenance: z.boolean().optional(),
  themePresets: themePresetsSchema.optional(),
}).strict();

export type SiteDocument = z.infer<typeof siteDocumentSchema>;
export type ThemeDocument = z.infer<typeof themeSchema>;

export function assertNoExecutableContent(value: unknown): boolean {
  const text = JSON.stringify(value).toLowerCase();
  return !/<script|javascript:|onerror=|onload=/.test(text);
}
