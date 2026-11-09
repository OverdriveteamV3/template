import type { CSSProperties } from "react";
import { isDarkColor, normalizeHex, readableForeground } from "@/lib/theme/contrast";

export const fontPresets = ["geist", "inter", "nunito", "manrope", "dm-sans", "outfit", "sora", "figtree", "plus-jakarta", "space-grotesk", "instrument-sans", "libre-baskerville", "playfair", "fraunces", "lora", "newsreader"] as const;
export const densityPresets = ["compact", "comfortable"] as const;
export const radiusPresets = ["12", "16"] as const;
export const buttonPresets = ["rounded", "pill"] as const;
export const layoutPresets = ["reference"] as const;

export type FontPreset = (typeof fontPresets)[number];
export type DensityPreset = (typeof densityPresets)[number];
export type RadiusPreset = (typeof radiusPresets)[number];
export type ButtonPreset = (typeof buttonPresets)[number];
export type ThemeMode = "light" | "dark";

export const fontChoices: { id: FontPreset; label: string; family: string; google?: string }[] = [
  { id: "geist", label: "Geist", family: "Geist" },
  { id: "inter", label: "Inter", family: "Inter" },
  { id: "nunito", label: "Nunito Sans", family: "Nunito Sans" },
  { id: "manrope", label: "Manrope", family: "Manrope", google: "Manrope" },
  { id: "dm-sans", label: "DM Sans", family: "DM Sans", google: "DM Sans" },
  { id: "outfit", label: "Outfit", family: "Outfit", google: "Outfit" },
  { id: "sora", label: "Sora", family: "Sora", google: "Sora" },
  { id: "figtree", label: "Figtree", family: "Figtree", google: "Figtree" },
  { id: "plus-jakarta", label: "Plus Jakarta Sans", family: "Plus Jakarta Sans", google: "Plus Jakarta Sans" },
  { id: "space-grotesk", label: "Space Grotesk", family: "Space Grotesk", google: "Space Grotesk" },
  { id: "instrument-sans", label: "Instrument Sans", family: "Instrument Sans", google: "Instrument Sans" },
  { id: "libre-baskerville", label: "Libre Baskerville", family: "Libre Baskerville", google: "Libre Baskerville" },
  { id: "playfair", label: "Playfair Display", family: "Playfair Display", google: "Playfair Display" },
  { id: "fraunces", label: "Fraunces", family: "Fraunces", google: "Fraunces" },
  { id: "lora", label: "Lora", family: "Lora", google: "Lora" },
  { id: "newsreader", label: "Newsreader", family: "Newsreader", google: "Newsreader" },
];

export const colorPalettes = [
  { id: "studio", name: "dash.paletteStudio", primary: "#ddf20a", secondary: "#00595b", background: "#ffffff", foreground: "#111111", mode: "light" },
  { id: "sand", name: "dash.paletteSand", primary: "#c4b396", secondary: "#6d5b45", background: "#f6f3ec", foreground: "#2c261c", mode: "light" },
  { id: "ink", name: "dash.paletteInk", primary: "#ddf20a", secondary: "#c4b396", background: "#111111", foreground: "#f6f3ec", mode: "dark" },
  { id: "sea", name: "dash.paletteSea", primary: "#7fd1c7", secondary: "#0e4d5c", background: "#f3fbfa", foreground: "#102226", mode: "light" },
  { id: "bloom", name: "dash.paletteBloom", primary: "#e7a0bf", secondary: "#6b2d44", background: "#fff6f3", foreground: "#2a141c", mode: "light" },
  { id: "grove", name: "dash.paletteGrove", primary: "#c6de45", secondary: "#1f6b4a", background: "#f7f8f2", foreground: "#14241c", mode: "light" },
] as const satisfies ReadonlyArray<{ id: string; name: string; primary: string; secondary: string; background: string; foreground: string; mode: ThemeMode }>;

export type ThemePalette = {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  font: FontPreset;
  mode: ThemeMode;
};

export type ThemeTokens = {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  primary: string;
  secondary: string;
  font: FontPreset;
  mode: ThemeMode;
  density: DensityPreset;
  radius: RadiusPreset;
  button: ButtonPreset;
  layout: "reference";
};

export const referenceTheme: ThemeTokens = {
  background: "#ffffff",
  surface: "#f6f5f1",
  foreground: "#111111",
  muted: "#6b6b64",
  border: "#e7e6e0",
  primary: "#ddf20a",
  secondary: "#00595b",
  font: "geist",
  mode: "light",
  density: "compact",
  radius: "16",
  button: "rounded",
  layout: "reference",
};

export const themePalettes: { id: string; name: string; colors: Pick<ThemeTokens, "background" | "surface" | "foreground" | "muted" | "border" | "primary" | "secondary"> }[] = [
  { id: "reference", name: "Reference", colors: referenceTheme },
  {
    id: "ink",
    name: "Ink",
    colors: {
      background: "#ffffff",
      surface: "#f4f4f5",
      foreground: "#111111",
      muted: "#5c5c66",
      border: "#e4e4e7",
      primary: "#111111",
      secondary: "#3f3f46",
    },
  },
  {
    id: "grove",
    name: "Grove",
    colors: {
      background: "#ffffff",
      surface: "#f3f6f2",
      foreground: "#14211b",
      muted: "#5d6b63",
      border: "#e1e8e2",
      primary: "#d7f26a",
      secondary: "#1f6b4a",
    },
  },
];

function mixHex(from: string, to: string, amount: number) {
  const left = normalizeHex(from) ?? "#000000";
  const right = normalizeHex(to) ?? "#ffffff";
  const channel = (index: number) => {
    const start = parseInt(left.slice(1 + index * 2, 3 + index * 2), 16);
    const end = parseInt(right.slice(1 + index * 2, 3 + index * 2), 16);
    return Math.round(start + (end - start) * amount).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const sat = saturation / 100;
  const light = lightness / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const section = (((hue % 360) + 360) % 360) / 60;
  const match = chroma * (1 - Math.abs((section % 2) - 1));
  const shift = light - chroma / 2;
  const [red, green, blue] = section < 1 ? [chroma, match, 0] : section < 2 ? [match, chroma, 0] : section < 3 ? [0, chroma, match] : section < 4 ? [0, match, chroma] : section < 5 ? [match, 0, chroma] : [chroma, 0, match];
  const channel = (value: number) => Math.round((value + shift) * 255).toString(16).padStart(2, "0");
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

export function randomTheme(current?: ThemePalette): ThemePalette {
  const hue = Math.floor(Math.random() * 360);
  const accent = (hue + 140 + Math.floor(Math.random() * 80)) % 360;
  const dark = Math.random() < 0.5;
  const spread = (min: number, max: number) => min + Math.random() * (max - min);
  const next: ThemePalette = {
    primary: hslToHex(hue, spread(68, 92), spread(48, 64)),
    secondary: hslToHex(accent, spread(42, 72), dark ? spread(55, 72) : spread(24, 40)),
    background: dark ? hslToHex(hue, spread(12, 28), spread(8, 14)) : hslToHex(hue, spread(10, 24), spread(96, 99)),
    foreground: dark ? hslToHex(hue, 12, 96) : hslToHex(hue, 18, 10),
    font: fontPresets[Math.floor(Math.random() * fontPresets.length)] ?? "geist",
    mode: dark ? "dark" : "light",
  };
  if (current && next.primary === current.primary && next.secondary === current.secondary && next.font === current.font) return randomTheme(current);
  return next;
}

export function withMode(palette: ThemePalette, mode: ThemeMode): ThemePalette {
  const dark = isDarkColor(palette.background);
  if ((mode === "dark" && !dark) || (mode === "light" && dark)) {
    return { ...palette, mode, background: palette.foreground, foreground: palette.background };
  }
  return { ...palette, mode };
}

export function paletteTheme(palette: ThemePalette): ThemeTokens {
  const background = normalizeHex(palette.background) ?? referenceTheme.background;
  const foreground = normalizeHex(palette.foreground) ?? referenceTheme.foreground;
  const primary = normalizeHex(palette.primary) ?? referenceTheme.primary;
  const secondary = normalizeHex(palette.secondary) ?? referenceTheme.secondary;
  const dark = isDarkColor(background);
  return {
    ...referenceTheme,
    primary,
    secondary,
    background,
    foreground,
    surface: mixHex(background, foreground, dark ? 0.08 : 0.04),
    muted: mixHex(foreground, background, 0.42),
    border: mixHex(background, foreground, dark ? 0.22 : 0.12),
    font: palette.font,
    mode: dark ? "dark" : "light",
  };
}

export function fontStack(font: FontPreset) {
  if (font === "geist" || font === "inter" || font === "nunito") return `var(--font-${font}), ui-sans-serif, system-ui, sans-serif`;
  const family = fontChoices.find((item) => item.id === font)?.family ?? "Geist";
  return `"${family}", ui-sans-serif, system-ui, sans-serif`;
}

export function googleFontHref(font: FontPreset) {
  const choice = fontChoices.find((item) => item.id === font);
  if (!choice?.google) return "";
  return `https://fonts.googleapis.com/css2?family=${choice.google.replaceAll(" ", "+")}:wght@400;500;600;700&display=swap`;
}

export function googleFontsHref() {
  const families = fontChoices.flatMap((item) => item.google ? [`family=${item.google.replaceAll(" ", "+")}:wght@400;600`] : []);
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

export function themeStyle(theme: ThemeTokens): CSSProperties {
  const onPrimary = readableForeground(theme.primary);
  const stack = fontStack(theme.font);
  return {
    background: theme.background,
    color: theme.foreground,
    fontFamily: stack,
    ["--background" as string]: theme.background,
    ["--surface" as string]: theme.surface,
    ["--foreground" as string]: theme.foreground,
    ["--muted" as string]: theme.muted,
    ["--border" as string]: theme.border,
    ["--primary" as string]: theme.primary,
    ["--secondary" as string]: theme.secondary,
    ["--on-primary" as string]: onPrimary,
    ["--radius-panel" as string]: `${theme.radius}px`,
    ["--font-active" as string]: stack,
  };
}
