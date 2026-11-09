import { z } from "zod";
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

export const themeSchema = z.object({
  background: hex,
  surface: hex,
  foreground: hex,
  muted: hex,
  border: hex,
  primary: hex,
  secondary: hex,
  font: z.enum(fontPresets),
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
    logoDarkUrl: link.or(z.literal("")).optional(),
    faviconUrl: link.or(z.literal("")).optional(),
  }),
  hero: z.object({
    imageUrl: link.or(z.literal("")).optional(),
    landingImageUrl: z.string().trim().max(500).refine((value) => value === "" || (/^(https?:\/\/|\/(?!\/))/i.test(value) && !value.includes("..")), "Use an image address.").optional(),
    profileUrl: link.or(z.literal("")).optional(),
    title: safeText.max(160),
    subtitle: safeText.max(240),
    cta: safeText.max(40),
    alt: safeText.max(180),
    focalX: z.number().min(0).max(100),
    focalY: z.number().min(0).max(100),
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
  gallery: z.array(z.object({ src: link, alt: safeText.max(180) })).max(12),
  testimonials: z.array(z.object({ quote: safeText.max(600), name: safeText.max(80), approved: z.boolean() })).max(12),
  faqs: z.array(z.object({ question: safeText.max(180), answer: safeText.max(800) })).max(20),
  seo: z.object({
    title: safeText.max(70),
    description: safeText.max(180),
    imageUrl: link.or(z.literal("")),
    indexable: z.boolean(),
  }),
}).strict();

export type SiteDocument = z.infer<typeof siteDocumentSchema>;
export type ThemeDocument = z.infer<typeof themeSchema>;

export function assertNoExecutableContent(value: unknown): boolean {
  const text = JSON.stringify(value).toLowerCase();
  return !/<script|javascript:|onerror=|onload=/.test(text);
}
