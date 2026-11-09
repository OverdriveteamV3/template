const HEX = /^#([\da-f]{3}|[\da-f]{6})$/i;

export function normalizeHex(input: string): string | null {
  const value = input.trim();
  if (!HEX.test(value)) return null;
  const raw = value.slice(1);
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  return `#${full.toLowerCase()}`;
}

function channel(hex: string, index: number) {
  return parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
}

function luminance(hex: string) {
  const parts = [0, 1, 2].map((index) => {
    const value = channel(hex, index);
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
}

export function contrastRatio(foreground: string, background: string) {
  const left = normalizeHex(foreground);
  const right = normalizeHex(background);
  if (!left || !right) return 1;
  const lighter = Math.max(luminance(left), luminance(right));
  const darker = Math.min(luminance(left), luminance(right));
  return (lighter + 0.05) / (darker + 0.05);
}

export function readableForeground(background: string) {
  const white = contrastRatio("#ffffff", background);
  const ink = contrastRatio("#111111", background);
  return white >= ink ? "#ffffff" : "#111111";
}

export function meetsContrast(foreground: string, background: string, minimum = 4.5) {
  return contrastRatio(foreground, background) >= minimum;
}
