"use client";

import type { PointerEvent } from "react";
import { normalizeHex } from "@/lib/theme/contrast";

function rgbToHsv(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
}

function hexToHsv(hex: string) {
  const value = normalizeHex(hex) ?? "#000000";
  return rgbToHsv(parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16));
}

function hsvToHex(hue: number, saturation: number, value: number) {
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = value - chroma;
  const sector = Math.floor(hue / 60) % 6;
  const channels = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ][sector] ?? [0, 0, 0];
  const hex = (channel: number) => Math.round((channel + match) * 255).toString(16).padStart(2, "0");
  return `#${hex(channels[0])}${hex(channels[1])}${hex(channels[2])}`;
}

export function GradientColorBox({ value, label, onChange }: { value: string; label: string; onChange: (hex: string) => void }) {
  const hsv = hexToHsv(value);

  function paint(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const saturation = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const brightness = 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    onChange(hsvToHex(hsv.h, saturation, brightness));
  }

  return (
    <div className="grid gap-3">
      <div
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s * 100)}
        tabIndex={0}
        className="relative h-36 w-full cursor-crosshair touch-none rounded-xl"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))` }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          paint(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) paint(event);
        }}
      >
        <span className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(17,17,17,0.45)]" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: value }} />
      </div>
      <input
        aria-label={`${label} hue`}
        type="range"
        min={0}
        max={360}
        value={Math.round(hsv.h)}
        onChange={(event) => onChange(hsvToHex(Number(event.target.value), hsv.s || 1, hsv.v || 1))}
        className="h-3 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-foreground [&::-webkit-slider-thumb]:bg-white"
        style={{ background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)" }}
      />
    </div>
  );
}
