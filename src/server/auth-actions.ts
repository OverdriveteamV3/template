"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/utils";
import { clearAccountAvatar, saveAccountAvatar } from "@/lib/auth/avatar";
import { clearMasterSession, isMasterLogin, masterViewer, saveMasterPassword, saveMasterProfile, startMasterSession } from "@/lib/auth/master";
import { formatPhoneNumber } from "@/lib/phone";
import { detectUpload } from "@/lib/uploads/signature";
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
  if (await isMasterLogin(login, password)) {
    await startMasterSession();
    redirect(next === "/" ? "/dashboard" : next);
  }
  if (!isSupabaseConfigured()) {
    const t = await translator();
    return { error: t("auth.invalid") };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: login, password });
  if (error) return { error: error.message };
  await supabase.rpc("accept_my_invitations");
  redirect(next);
}

export async function signUp(formData: FormData) {
  const t = await translator();
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name || !email || !phone || password.length < 8) return { error: t("auth.invalid") };
  if (!/^[0-9+().\-\s]{7,20}$/.test(phone)) return { error: t("auth.phoneInvalid") };
  const supabase = await createClient();
  const next = safeInternalPath(String(formData.get("next") ?? "/"));
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { full_name: name, phone },
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
  const t = await translator();
  const name = String(formData.get("name") ?? "").trim();
  const phone = formatPhoneNumber(String(formData.get("phone") ?? ""));
  if (!name) return { error: t("auth.invalid") };
  if (phone && phone.replace(/\D/g, "").length < 10) return { error: t("auth.phoneInvalid") };
  if (await masterViewer()) {
    await saveMasterProfile(name, phone);
    return { ok: true as const };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { error: t("auth.invalid") };
  const { error } = await supabase.from("customer_profiles").upsert({
    user_id: data.claims.sub,
    full_name: name,
    phone: phone || null,
  });
  if (error) return { error: error.message };
  return { ok: true as const };
}

async function accountUserId() {
  const master = await masterViewer();
  if (master) return master.id;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

export async function updateAvatar(formData: FormData) {
  const t = await translator();
  const userId = await accountUserId();
  if (!userId) return { error: t("auth.invalid") };
  if (formData.get("remove") === "1") {
    await clearAccountAvatar(userId);
    return { avatar: "" };
  }
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0 || file.size > 5_000_000) return { error: t("dash.photoInvalid") };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectUpload(bytes);
  if (!kind || kind.mime === "application/pdf") return { error: t("dash.photoInvalid") };
  const saved = await saveAccountAvatar(userId, bytes, kind.mime);
  if ("error" in saved) return { error: saved.error };
  return { avatar: saved.url };
}

export async function changePassword(formData: FormData) {
  const t = await translator();
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8 || password !== confirm) return { error: t("auth.invalid") };
  if (await masterViewer()) {
    const saved = await saveMasterPassword(current, password);
    return saved ? { ok: true as const } : { error: t("auth.invalid") };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return { error: t("auth.invalid") };
  const check = await supabase.auth.signInWithPassword({ email, password: current });
  if (check.error) return { error: t("auth.invalid") };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: true as const };
}
