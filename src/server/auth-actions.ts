"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/utils";
import { clearMasterSession, isMasterLogin, startMasterSession } from "@/lib/auth/master";
import { translator } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function origin() {
  return headers().then((value) => {
    const host = value.get("host") ?? "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
  });
}

export async function signIn(formData: FormData) {
  const login = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeInternalPath(String(formData.get("next") ?? "/"));
  if (!isSupabaseConfigured()) {
    if (!isMasterLogin(login, password)) {
      const t = await translator();
      return { error: t("auth.invalid") };
    }
    await startMasterSession();
    redirect(next === "/" ? "/dashboard" : next);
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: login, password });
  if (error) return { error: error.message };
  await supabase.rpc("accept_my_invitations");
  redirect(next);
}

export async function signUp(formData: FormData) {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  const supabase = await createClient();
  const next = safeInternalPath(String(formData.get("next") ?? "/"));
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { full_name: String(formData.get("name") ?? "") },
    },
  });
  if (error) return { error: error.message };
  redirect(`/sign-in?notice=check-email&next=${encodeURIComponent(next)}`);
}

export async function requestReset(formData: FormData) {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(String(formData.get("email") ?? ""), {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: error.message };
  return { ok: true as const };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: String(formData.get("password") ?? "") });
  if (error) return { error: error.message };
  redirect("/account");
}

export async function signOut() {
  await clearMasterSession();
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { error: "Sign in first." };
  const { error } = await supabase.from("customer_profiles").upsert({
    user_id: data.claims.sub,
    full_name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? "") || null,
  });
  if (error) return { error: error.message };
  return { ok: true as const };
}
