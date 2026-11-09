import type { CSSProperties } from "react";
import { readableForeground } from "@/lib/theme/contrast";

export const fontPresets = ["geist", "inter", "nunito"] as const;
export const densityPresets = ["compact", "comfortable"] as const;
export const radiusPresets = ["12", "16"] as const;
export const buttonPresets = ["rounded", "pill"] as const;
export const layoutPresets = ["reference"] as const;

export type FontPreset = (typeof fontPresets)[number];
export type DensityPreset = (typeof densityPresets)[number];
export type RadiusPreset = (typeof radiusPresets)[number];
export type ButtonPreset = (typeof buttonPresets)[number];

export type ThemeTokens = {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  primary: string;
  secondary: string;
  font: FontPreset;
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

export function themeStyle(theme: ThemeTokens): CSSProperties {
  const onPrimary = readableForeground(theme.primary);
  return {
    background: theme.background,
    color: theme.foreground,
    ["--background" as string]: theme.background,
    ["--surface" as string]: theme.surface,
    ["--foreground" as string]: theme.foreground,
    ["--muted" as string]: theme.muted,
    ["--border" as string]: theme.border,
    ["--primary" as string]: theme.primary,
    ["--secondary" as string]: theme.secondary,
    ["--on-primary" as string]: onPrimary,
    ["--radius-panel" as string]: `${theme.radius}px`,
    ["--font-active" as string]: `var(--font-${theme.font})`,
  };
}
