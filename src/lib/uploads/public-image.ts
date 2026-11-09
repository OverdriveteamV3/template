import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { detectUpload } from "@/lib/uploads/signature";

export async function storePublicImage(tenantId: string, file: File) {
  if (file.size > 5_000_000) return { error: "Images must be 5 MB or smaller." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectUpload(bytes);
  if (!kind || kind.mime === "application/pdf") return { error: "Use a JPEG, PNG, or WebP image." };
  const supabase = createAdminClient();
  const path = `${tenantId}/forms/${crypto.randomUUID()}.${kind.ext}`;
  const uploaded = await supabase.storage.from("brand").upload(path, bytes, { contentType: kind.mime, upsert: false });
  if (uploaded.error) return { error: uploaded.error.message };
  await supabase.from("assets").insert({
    tenant_id: tenantId,
    storage_path: path,
    mime: kind.mime,
    byte_size: bytes.byteLength,
    kind: "brand",
    visibility: "public",
  });
  return { url: supabase.storage.from("brand").getPublicUrl(path).data.publicUrl };
}
