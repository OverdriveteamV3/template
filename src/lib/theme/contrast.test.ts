import { describe, expect, it } from "vitest";
import { contrastRatio, meetsContrast, readableForeground } from "@/lib/theme/contrast";

describe("contrast", () => {
  it("picks dark text for the reference lime", () => {
    expect(readableForeground("#ddf20a")).toBe("#111111");
    expect(meetsContrast("#111111", "#ddf20a")).toBe(true);
  });

  it("picks light text for the deep secondary", () => {
    expect(readableForeground("#00595b")).toBe("#ffffff");
    expect(contrastRatio("#ffffff", "#00595b")).toBeGreaterThan(4.5);
  });

  it("rejects a malformed color instead of inventing contrast", () => {
    expect(contrastRatio("lime", "#ffffff")).toBe(1);
  });
});
