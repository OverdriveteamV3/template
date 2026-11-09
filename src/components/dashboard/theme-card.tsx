"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { GradientColorBox } from "@/components/dashboard/color-field";
import { useT } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { isDarkColor, normalizeHex } from "@/lib/theme/contrast";
import type { ThemePreset } from "@/lib/content/schema";
import { deleteThemePreset, saveTheme, saveThemePreset } from "@/server/dashboard-actions";
import { colorPalettes, fontChoices, fontStack, googleFontsHref, randomTheme, withMode, type ThemePalette } from "@/lib/theme/tokens";

const colors = [
  { key: "primary", label: "dash.themePrimary" },
  { key: "secondary", label: "dash.themeSecondary" },
  { key: "background", label: "dash.themeBackground" },
  { key: "foreground", label: "dash.themeText" },
] as const satisfies { key: keyof Pick<ThemePalette, "primary" | "secondary" | "background" | "foreground">; label: MessageKey }[];

export function ThemeCard({ theme, presets, onChange }: { theme: ThemePalette; presets: ThemePreset[]; onChange: (theme: ThemePalette) => void }) {
  const t = useT();
  const [active, setActive] = useState<(typeof colors)[number]["key"]>("primary");
  const [codes, setCodes] = useState({ primary: theme.primary, secondary: theme.secondary, background: theme.background, foreground: theme.foreground });
  const [savedPresets, setSavedPresets] = useState(presets);
  const [presetName, setPresetName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const current = colors.find((item) => item.key === active) ?? colors[0];

  useEffect(() => {
    setCodes({ primary: theme.primary, secondary: theme.secondary, background: theme.background, foreground: theme.foreground });
  }, [theme.primary, theme.secondary, theme.background, theme.foreground]);

  function paletteData(name = "") {
    const data = new FormData();
    if (name) data.set("name", name);
    data.set("primary", theme.primary);
    data.set("secondary", theme.secondary);
    data.set("background", theme.background);
    data.set("foreground", theme.foreground);
    data.set("font", theme.font);
    data.set("mode", theme.mode);
    return data;
  }

  async function storePreset() {
    const name = presetName.trim();
    if (!name) {
      setNotice("");
      setError(t("dash.presetNameRequired"));
      return;
    }
    setPending(true);
    setNotice("");
    const result = await saveThemePreset(paletteData(name));
    setPending(false);
    if (result && "error" in result && result.error) setError(result.error);
    else {
      setError(null);
      setNotice(t("dash.presetSaved"));
      setPresetName("");
      if (result && "presets" in result && result.presets) setSavedPresets(result.presets);
    }
  }

  async function removePreset(name: string) {
    const data = new FormData();
    data.set("name", name);
    const result = await deleteThemePreset(data);
    if (result && "error" in result && result.error) setError(result.error);
    else if (result && "presets" in result && result.presets) setSavedPresets(result.presets);
  }

  function paint(key: (typeof colors)[number]["key"], hex: string) {
    const next = { ...theme, [key]: hex };
    onChange(key === "background" ? { ...next, mode: isDarkColor(hex) ? "dark" : "light" } : next);
  }

  return (
    <article className="panel p-5">
      <link rel="stylesheet" href={googleFontsHref()} />
      <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="text-base font-semibold">{t("dash.theme")}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={open ? "mt-4" : "hidden"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xs text-muted">{t("dash.themeNote")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onChange(randomTheme(theme))} className="whitespace-nowrap rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold">{t("dash.generateUi")}</button>
          <div className="inline-flex rounded-xl border border-border bg-white p-1" role="group" aria-label={t("dash.themeMode")}>
          {(["light", "dark"] as const).map((mode) => (
            <button key={mode} type="button" aria-pressed={theme.mode === mode} onClick={() => onChange(withMode(theme, mode))} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${theme.mode === mode ? "bg-foreground text-background" : "text-muted"}`}>
              {t(mode === "light" ? "dash.themeLight" : "dash.themeDark")}
            </button>
          ))}
          </div>
        </div>
      </div>
      <form className="mt-4 grid gap-4 border-t border-border pt-4" action={async (formData) => {
        setPending(true);
        setNotice("");
        const result = await saveTheme(formData);
        setPending(false);
        if (result && "error" in result && result.error) setError(result.error);
        else { setError(null); setNotice(t("dash.saved")); }
      }}>
        <input type="hidden" name="primary" value={theme.primary} />
        <input type="hidden" name="secondary" value={theme.secondary} />
        <input type="hidden" name="background" value={theme.background} />
        <input type="hidden" name="foreground" value={theme.foreground} />
        <input type="hidden" name="font" value={theme.font} />
        <input type="hidden" name="mode" value={theme.mode} />
        <label className="grid max-w-sm gap-1 text-sm">{t("dash.themeFont")}
          <select name="fontChoice" value={theme.font} onChange={(event) => onChange({ ...theme, font: event.target.value as ThemePalette["font"] })} className="h-11 rounded-xl border border-border bg-white px-3" style={{ fontFamily: fontStack(theme.font) }}>
            {fontChoices.map((font) => <option key={font.id} value={font.id} style={{ fontFamily: font.google ? `"${font.family}", sans-serif` : fontStack(font.id) }}>{font.label}</option>)}
          </select>
        </label>
        <GradientColorBox value={theme[active]} label={t(current.label)} onChange={(hex) => paint(active, hex)} />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {colorPalettes.map((palette) => {
            const selected = [palette.primary, palette.secondary, palette.background, palette.foreground].every((hex, index) => hex === [theme.primary, theme.secondary, theme.background, theme.foreground][index]?.toLowerCase());
            return (
              <button key={palette.id} type="button" aria-pressed={selected} onClick={() => onChange({ ...theme, primary: palette.primary, secondary: palette.secondary, background: palette.background, foreground: palette.foreground, mode: palette.mode })} className={`overflow-hidden rounded-xl border bg-white text-left ${selected ? "border-foreground" : "border-border"}`}>
                <span className="grid h-10 grid-cols-4">
                  <span style={{ background: palette.primary }} />
                  <span style={{ background: palette.secondary }} />
                  <span style={{ background: palette.background }} />
                  <span style={{ background: palette.foreground }} />
                </span>
                <span className="block truncate px-1.5 py-1 text-[10px] font-semibold">{t(palette.name)}</span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {colors.map((color) => (
            <label key={color.key} className={`grid gap-1 rounded-xl border p-3 text-sm ${active === color.key ? "border-foreground" : "border-border"}`}>
              <span className="font-medium">{t(color.label)}</span>
              <span className="flex items-center gap-2">
                <button type="button" aria-label={t(color.label)} aria-pressed={active === color.key} onClick={() => setActive(color.key)} className="h-11 w-11 shrink-0 rounded-xl border border-border" style={{ background: theme[color.key] }} />
                <input aria-label={t("dash.colorCode")} value={codes[color.key]} spellCheck={false} onFocus={() => setActive(color.key)} onChange={(event) => {
                  const next = event.target.value;
                  setCodes((current) => ({ ...current, [color.key]: next }));
                  const parsed = normalizeHex(next);
                  if (parsed) paint(color.key, parsed);
                }} className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-white px-3 font-mono text-sm uppercase" />
              </span>
            </label>
          ))}
        </div>
        {savedPresets.length ? (
          <div className="flex flex-wrap gap-2">
            {savedPresets.map((preset) => (
              <span key={preset.name} className="inline-flex items-center rounded-xl border border-border bg-white">
                <button type="button" className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold" onClick={() => onChange({ primary: preset.primary, secondary: preset.secondary, background: preset.background, foreground: preset.foreground, font: preset.font, mode: preset.mode })}>
                  <span className="h-3 w-3 rounded-full border border-border" style={{ background: preset.primary }} />
                  {preset.name}
                </button>
                <button type="button" aria-label={t("dash.removePreset", { name: preset.name })} className="pr-2 text-sm text-muted" onClick={() => void removePreset(preset.name)}>×</button>
              </span>
            ))}
          </div>
        ) : null}
        {error ? <p role="alert" className="text-sm text-secondary">{error}</p> : null}
        {notice ? <p className="text-sm font-semibold">{notice}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <input value={presetName} maxLength={40} placeholder={t("dash.presetName")} onChange={(event) => setPresetName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void storePreset(); } }} className="h-9 min-w-40 flex-1 rounded-xl border border-border bg-white px-3 text-sm" />
            <button type="button" className="h-9 whitespace-nowrap rounded-xl border border-border bg-white px-4 text-sm font-semibold disabled:opacity-60" disabled={pending} onClick={() => void storePreset()}>{t("dash.savePreset")}</button>
          </div>
          <button className="h-9 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-60" type="submit" disabled={pending}>{t("common.save")}</button>
        </div>
      </form>
      </div>
    </article>
  );
}
