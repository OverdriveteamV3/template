import { DateTime } from "luxon";
import { ScrollRow } from "@/components/booking/scroll-row";

export function DateStrip({ days, selected, available, onSelect }: { days: DateTime[]; selected: string; available: Set<string>; onSelect: (isoDate: string) => void }) {
  return (
    <ScrollRow previousLabel="Previous days" nextLabel="Next days" scrollerRole="radiogroup" scrollerLabel="Appointment date" focusKey={selected} controls="tabs">
      {days.map((day) => {
        const iso = day.toISODate() ?? "";
        const open = available.has(iso);
        const isSelected = iso === selected;
        return (
          <div key={iso} className="flex w-10 shrink-0 flex-col items-center gap-1">
            <span className="text-[10px] font-medium tracking-[0.12em] text-[#9b9b94]">{day.toFormat("ccc").slice(0, 3).toUpperCase()}</span>
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={day.toFormat("cccc d")}
              data-carousel-selected={isSelected ? "true" : undefined}
              disabled={!open}
              onClick={() => onSelect(iso)}
              className={`h-9 w-9 rounded-[10px] text-sm font-medium ${isSelected ? "bg-[#111] text-white" : open ? "border border-[#e6e5df] bg-white text-[#111]" : "text-[#b7b7b0]"}`}
            >
              {day.day}
            </button>
          </div>
        );
      })}
    </ScrollRow>
  );
}
