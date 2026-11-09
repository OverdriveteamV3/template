import { DateTime } from "luxon";
import type { Slot } from "@/lib/availability/slots";
import { ScrollRow } from "@/components/booking/scroll-row";

const groups = [
  { id: "morning", label: "Morning", match: (hour: number) => hour < 12 },
  { id: "day", label: "Day", match: (hour: number) => hour >= 12 },
] as const;

export function TimeSlots({ slots, timezone, selected, onSelect }: { slots: Slot[]; timezone: string; selected: string; onSelect: (start: string) => void }) {
  const grouped = groups.map((group) => ({
    ...group,
    slots: slots.filter((slot) => group.match(DateTime.fromISO(slot.start, { zone: "utc" }).setZone(timezone).hour)),
  })).filter((group) => group.slots.length > 0);
  if (grouped.length === 0) return null;
  return (
    <div className="space-y-3">
      {grouped.map((group) => (
        <div key={group.id} role="group" aria-labelledby={`${group.id}-slots`}>
          <p id={`${group.id}-slots`} className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-[#9b9b94]">{group.label.toUpperCase()}</p>
          <ScrollRow previousLabel={`Previous ${group.label.toLowerCase()} times`} nextLabel={`Next ${group.label.toLowerCase()} times`} focusKey={selected}>
            {group.slots.map((slot) => {
              const label = DateTime.fromISO(slot.start, { zone: "utc" }).setZone(timezone).toFormat("h:mm a");
              const pressed = selected === slot.start;
              return (
                <button
                  key={slot.start}
                  type="button"
                  aria-pressed={pressed}
                  data-carousel-selected={pressed ? "true" : undefined}
                  onClick={() => onSelect(slot.start)}
                  className={`h-9 w-[76px] shrink-0 rounded-full border px-2 text-[13px] leading-none ${pressed ? "border-[#111] bg-[#111] text-white" : "border-[#e6e5df] bg-white text-[#111]"}`}
                >
                  {label}
                </button>
              );
            })}
          </ScrollRow>
        </div>
      ))}
    </div>
  );
}
