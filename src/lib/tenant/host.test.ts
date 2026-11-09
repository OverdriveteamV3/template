import { describe, expect, it } from "vitest";
import { resolveHost } from "@/lib/tenant/host";

const multi = {
  rootDomain: "book.overdriveio.com",
  platformHosts: ["book.overdriveio.com", "localhost", "127.0.0.1"],
};

describe("resolveHost", () => {
  it("treats the platform host as the owner entry", () => {
    expect(resolveHost("book.overdriveio.com", multi).kind).toBe("platform");
    expect(resolveHost("localhost:3000", { ...multi, rootDomain: "localhost" }).kind).toBe("platform");
  });

  it("reads a tenant slug from the subdomain and ignores the port", () => {
    expect(resolveHost("demo-studio.localhost:3000", { ...multi, rootDomain: "localhost" })).toEqual({
      kind: "slug",
      slug: "demo-studio",
    });
  });

  it("keeps an unknown custom host for a verified-domain lookup", () => {
    expect(resolveHost("booking.northline.example", multi)).toEqual({
      kind: "custom",
      hostname: "booking.northline.example",
    });
  });

  it("rejects other businesses when a deployment is locked to one tenant", () => {
    const locked = { ...multi, rootDomain: "localhost", tenantLockSlug: "demo-studio" };
    expect(resolveHost("demo-studio.localhost", locked)).toEqual({ kind: "slug", slug: "demo-studio" });
    expect(resolveHost("other.localhost", locked).kind).toBe("unknown");
    expect(resolveHost("localhost", locked).kind).toBe("unknown");
  });
});
