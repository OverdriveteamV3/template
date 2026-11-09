import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

function photoPath(userId: string) {
  return `profiles/${userId}/photo`;
}

export async function readAccountAvatar(userId: string) {
  const admin = createAdminClient();
  const listed = await admin.storage.from("brand").list(`profiles/${userId}`, { limit: 5 });
  const file = listed.data?.find((item) => item.name === "photo");
  if (listed.error || !file) return "";
  const url = admin.storage.from("brand").getPublicUrl(photoPath(userId)).data.publicUrl;
  return file.updated_at ? `${url}?v=${encodeURIComponent(file.updated_at)}` : url;
}

export async function saveAccountAvatar(userId: string, bytes: Uint8Array, mime: string) {
  const admin = createAdminClient();
  const uploaded = await admin.storage.from("brand").upload(photoPath(userId), bytes, { contentType: mime, upsert: true });
  if (uploaded.error) return { error: uploaded.error.message };
  const url = admin.storage.from("brand").getPublicUrl(photoPath(userId)).data.publicUrl;
  return { url: `${url}?v=${Date.now()}` };
}

export async function clearAccountAvatar(userId: string) {
  await createAdminClient().storage.from("brand").remove([photoPath(userId)]);
}
