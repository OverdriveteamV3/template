"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabasePublicEnv } from "@/lib/supabase/env";

export function createBrowserSupabase() {
  const { url, key } = supabasePublicEnv();
  return createBrowserClient(url, key);
}
