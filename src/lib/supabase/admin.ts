import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabasePublicEnv, supabaseSecretKey } from "@/lib/supabase/env";

export function createAdminClient() {
  const { url } = supabasePublicEnv();
  return createClient(url, supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
