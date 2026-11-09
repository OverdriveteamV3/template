"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/locale-provider";

export function OpacitySlider({ defaultValue, onValueChange }: { defaultValue: number; onValueChange?: (value: number) => void }) {
  const t = useT();
  const [value, setValue] = useState(defaultValue);
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between gap-3">
        <span>{t("dash.opacity")}</span>
        <span className="text-muted">{value}</span>
      </span>
      <input name="backgroundOpacity" type="range" min={0} max={100} value={value} onChange={(event) => { const next = Number(event.target.value); setValue(next); onValueChange?.(next); }} className="w-full accent-foreground" />
    </label>
  );
}
