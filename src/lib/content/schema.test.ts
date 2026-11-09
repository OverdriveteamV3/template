import { describe, expect, it } from "vitest";
import { assertNoExecutableContent, siteDocumentSchema } from "@/lib/content/schema";

const document = {
  identity: { name: "Northline", category: "Salon", tagline: "Hello", logoUrl: "", logoDarkUrl: "", faviconUrl: "" },
  hero: { imageUrl: "", profileUrl: "", title: "Northline", subtitle: "Hello", cta: "Book", alt: "", focalX: 50, focalY: 40 },
  about: { body: "A fictional studio.", companyBio: "", professionalBio: "", short: "Hello", visible: true },
  contact: { email: "", phone: "", address: "", mapUrl: "", hours: "", socials: [] },
  facts: [],
  sections: ["about", "services"],
  gallery: [],
  testimonials: [],
  faqs: [],
  seo: { title: "Northline", description: "Hello", imageUrl: "", indexable: false },
};

describe("site document", () => {
  it("rejects an attribution field and executable content", () => {
    expect(siteDocumentSchema.safeParse(document).success).toBe(true);
    expect(siteDocumentSchema.safeParse({ ...document, poweredBy: false }).success).toBe(false);
    expect(assertNoExecutableContent({ ...document, about: { body: "<script>alert(1)</script>" } })).toBe(false);
  });
});
