"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";
import { DashboardBackup } from "@/components/dashboard/dashboard-backup";
import { formatPhoneNumber } from "@/lib/phone";
import { changePassword, updateAvatar, updateProfile } from "@/server/auth-actions";

const field = "mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-3";

export function AccountSettings({ name, email, phone, username, avatar }: { name: string; email: string; phone: string; username: string; avatar: string }) {
  const t = useT();
  const initials = initialsFor(name || username);
  const [photo, setPhoto] = useState(avatar);
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-foreground px-6 py-8 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">{t("dash.settingsEyebrow")}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">{t("dash.settings")}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">{t("dash.settingsLead")}</p>
        </div>
      </section>
      <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <ProfilePhoto initials={initials} avatar={photo} onAvatar={setPhoto} />
        <ProfileForm name={name} email={email} phone={phone} username={username} />
        <PasswordForm />
      </section>
    </div>
  );
}

function ProfilePhoto({ initials, avatar, onAvatar }: { initials: string; avatar: string; onAvatar: (url: string) => void }) {
  const t = useT();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(formData: FormData) {
    setBusy(true);
    setError(null);
    const result = await updateAvatar(formData);
    setBusy(false);
    if (result && "error" in result && result.error) setError(result.error);
    else if (result && "avatar" in result) {
      onAvatar(result.avatar ?? "");
      router.refresh();
    }
  }

  return (
    <div className="flex items-start gap-3">
      <button type="button" className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface text-sm font-semibold" aria-label={avatar ? t("dash.changePhoto") : t("dash.uploadPhoto")} onClick={() => input.current?.click()}>
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials}
      </button>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold">{t("auth.profile")}</h3>
        <p className="mt-2 text-xs text-muted">{t("dash.photoTypes")}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? t("dash.uploading") : avatar ? t("dash.changePhoto") : t("dash.uploadPhoto")}
          </button>
          {avatar ? (
            <button type="button" className="px-2 py-1.5 text-xs font-semibold text-muted disabled:opacity-40" disabled={busy} onClick={() => {
              const formData = new FormData();
              formData.set("remove", "1");
              void send(formData);
            }}>{t("dash.removePhoto")}</button>
          ) : null}
        </div>
        {error ? <p role="alert" className="mt-2 text-xs text-secondary">{error}</p> : null}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const formData = new FormData();
        formData.set("avatar", file);
        void send(formData);
      }} />
    </div>
  );
}

function ProfileForm({ name, email, phone, username }: { name: string; email: string; phone: string; username: string }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [phoneValue, setPhoneValue] = useState(formatPhoneNumber(phone));
  return (
    <form className="mt-5 space-y-4 border-t border-border pt-5" action={async (formData) => {
      setSaved(false);
      const result = await updateProfile(formData);
      if (result && "error" in result && result.error) setError(result.error);
      else { setError(null); setSaved(true); }
    }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">{t("dash.username")}<input className={`${field} bg-surface text-muted`} value={username} readOnly /></label>
        <label className="block text-sm font-medium">{t("common.name")}<input className={field} name="name" defaultValue={name} autoComplete="name" required /></label>
        <label className="block text-sm font-medium">{t("common.email")}<input className={`${field} bg-surface text-muted`} value={email} readOnly /></label>
        <label className="block text-sm font-medium">{t("common.phone")}<input className={field} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 555-5555" value={phoneValue} onChange={(event) => setPhoneValue(formatPhoneNumber(event.target.value))} /></label>
      </div>
      {error ? <p role="alert" className="rounded-lg bg-surface px-3 py-2 text-sm text-secondary">{error}</p> : null}
      {saved ? <p className="rounded-lg bg-surface px-3 py-2 text-sm font-semibold">{t("dash.profileSaved")}</p> : null}
      <div className="flex flex-nowrap items-center justify-between gap-2">
        <DashboardBackup />
        <button className="btn-primary !w-auto shrink-0 whitespace-nowrap px-5" type="submit">{t("auth.saveProfile")}</button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const compared = next.length > 0 && confirm.length > 0;
  return (
    <form className="mt-6 border-t border-border pt-5" action={async (formData) => {
      setSaved(false);
      const result = await changePassword(formData);
      if (result && "error" in result && result.error) setError(result.error);
      else { setError(null); setSaved(true); setNext(""); setConfirm(""); }
    }}>
      <button type="button" className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span>
          <span className="block text-sm font-semibold">{t("dash.changePassword")}</span>
          <span className="mt-1 block text-xs text-muted">{t("dash.changePasswordNote")}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium">{t("dash.currentPassword")}<input className={field} name="current" type="password" autoComplete="current-password" required /></label>
            <label className="block text-sm font-medium">{t("dash.newPassword")}<input className={field} name="password" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(event) => setNext(event.target.value)} required /></label>
            <label className="block text-sm font-medium">{t("dash.confirmPassword")}<input className={field} name="confirm" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></label>
          </div>
          {compared ? <p className={`text-xs font-medium ${next === confirm ? "text-foreground" : "text-secondary"}`}>{next === confirm ? t("dash.passwordsMatch") : t("dash.passwordsDiffer")}</p> : null}
          {error ? <p role="alert" className="rounded-lg bg-surface px-3 py-2 text-sm text-secondary">{error}</p> : null}
          {saved ? <p className="rounded-lg bg-surface px-3 py-2 text-sm font-semibold">{t("dash.passwordSaved")}</p> : null}
          <div className="flex justify-end">
            <button className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40" type="submit" disabled={!compared || next !== confirm}>{t("auth.updatePassword")}</button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function initialsFor(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  return value.trim().slice(0, 2).toUpperCase() || "?";
}
