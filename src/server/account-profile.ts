import "server-only";

import { readAccountAvatar } from "@/lib/auth/avatar";
import { MASTER_USER_ID, readMasterProfile } from "@/lib/auth/master";
import { createClient } from "@/lib/supabase/server";
import type { Viewer } from "@/server/site";

export async function loadAccountProfile(viewer: Viewer) {
  if (viewer.id === MASTER_USER_ID) {
    const saved = await readMasterProfile();
    return { name: saved.name, phone: saved.phone, email: viewer.email, username: "admin", avatar: await readAccountAvatar(viewer.id), master: true };
  }
  const supabase = await createClient();
  const { data } = await supabase.from("customer_profiles").select("full_name, phone").eq("user_id", viewer.id).maybeSingle();
  return {
    name: data?.full_name ?? "",
    phone: data?.phone ?? "",
    email: viewer.email,
    username: viewer.email.split("@")[0] || viewer.email,
    avatar: await readAccountAvatar(viewer.id),
    master: false,
  };
}
