"use client";

import { DateTime } from "luxon";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { luxonLocale, weekdays } from "@/lib/i18n/locale";

export function FullCalendar({ month, selected, available, onSelect }: { month: DateTime; selected: string; available: Set<string>; onSelect: (isoDate: string) => void }) {
  const t = useT();
  const locale = useLocale();
  const start = month.setLocale(luxonLocale(locale)).startOf("month");
  const lead = start.weekday % 7;
  const cells = Array.from({ length: lead + (month.daysInMonth ?? 30) }, (_, index) => (index < lead ? null : start.plus({ days: index - lead })));
  return (
    <div className="grid grid-cols-7 gap-1 text-center text-xs" role="radiogroup" aria-label={t("booking.dates")}>
      {weekdays(locale).map((label, index) => (
        <span key={`${label}-${index}`} className="text-[10px] text-muted">{label}</span>
      ))}
      {cells.map((day, index) => {
        if (!day) return <span key={`empty-${index}`} />;
        const iso = day.toISODate() ?? "";
        const open = available.has(iso);
        const selectedDay = iso === selected;
        return (
          <button
            key={iso}
            type="button"
            role="radio"
            aria-checked={selectedDay}
            disabled={!open}
            aria-label={day.toFormat("cccc d")}
            onClick={() => onSelect(iso)}
            className={`grid h-8 w-8 place-items-center justify-self-center rounded-full border p-0 text-[13px] leading-none ${selectedDay ? "border-[#111] bg-[#111] text-white" : open ? "border-[#e6e5df] bg-white text-[#111]" : "border-transparent bg-transparent text-[#b7b7b0] line-through"}`}
          >
            {day.day}
          </button>
        );
      })}
    </div>
  );
}
