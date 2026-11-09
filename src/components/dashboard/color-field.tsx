"use client";

import { useState } from "react";

export function ColorField({ name, label, value, disabled }: { name: string; label: string; value: string; disabled?: boolean }) {
  const [color, setColor] = useState(value);
  const swatch = /^#[\da-f]{6}$/i.test(color) ? color : "#111111";
  return (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input type="color" aria-label={label} value={swatch} disabled={disabled} onChange={(event) => setColor(event.target.value)} className="h-10 w-10 cursor-pointer rounded-lg border border-border bg-white p-1 disabled:cursor-not-allowed" />
        <input name={name} value={color} disabled={disabled} onChange={(event) => setColor(event.target.value)} className="w-full rounded-xl border border-border px-3 py-2" />
      </span>
    </label>
  );
}
