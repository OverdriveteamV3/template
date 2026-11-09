import { describe, expect, it } from "vitest";
import { detectUpload } from "@/lib/uploads/signature";

describe("upload signatures", () => {
  it("accepts png bytes and rejects a renamed text file", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectUpload(png)?.ext).toBe("png");
    expect(detectUpload(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
  });
});
