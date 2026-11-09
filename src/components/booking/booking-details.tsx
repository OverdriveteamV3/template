"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown } from "lucide-react";
import { DateTime } from "luxon";
import { useState } from "react";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { luxonLocale } from "@/lib/i18n/locale";
import type { Slot } from "@/lib/availability/slots";
import type { PublicStaff } from "@/lib/site/types";

function timesFor(match: (hour: number) => boolean, slots: Slot[], taken: Slot[], staffId: string, timezone: string, clock: string) {
  const rows = new Map<string, boolean>();
  for (const slot of taken) {
    const local = DateTime.fromISO(slot.start, { zone: "utc" }).setZone(timezone);
    if (!match(local.hour) || (staffId !== "any" && !slot.staffIds.includes(staffId))) continue;
    rows.set(slot.start, false);
  }
  for (const slot of slots) {
    const local = DateTime.fromISO(slot.start, { zone: "utc" }).setZone(timezone);
    if (!match(local.hour) || (staffId !== "any" && !slot.staffIds.includes(staffId))) continue;
    rows.set(slot.start, true);
  }
  return [...rows.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([start, available]) => ({ start, available, label: DateTime.fromISO(start, { zone: "utc" }).setZone(timezone).setLocale(clock).toFormat("h:mm a") }));
}

const groups = [
  { id: "morning", label: "booking.morning", match: (hour: number) => hour < 12 },
  { id: "day", label: "booking.day", match: (hour: number) => hour >= 12 },
] as const;

export function BookingDetails({
  date,
  timezone,
  techs,
  slots,
  taken,
  initialStaff,
  initialStart,
  onClose,
  onConfirm,
}: {
  date: string;
  timezone: string;
  techs: PublicStaff[];
  slots: Slot[];
  taken: Slot[];
  initialStaff: string;
  initialStart: string;
  onClose: () => void;
  onConfirm: (choice: { start: string; staff: string }) => void;
}) {
  const [staffId, setStaffId] = useState(initialStaff || "any");
  const [start, setStart] = useState(initialStart);
  const t = useT();
  const clock = luxonLocale(useLocale());
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const when = DateTime.fromISO(date, { zone: timezone }).setLocale(clock);
  const chosen = slots.some((slot) => slot.start === start && (staffId === "any" || slot.staffIds.includes(staffId))) ? start : "";
  const grouped = groups
    .map((group) => ({ ...group, times: timesFor(group.match, slots, taken, staffId, timezone, clock) }))
    .filter((group) => group.times.length > 0);

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[min(640px,calc(100vh-2rem))] w-[min(360px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl bg-[#f6f5f1] p-4" aria-describedby={undefined}>
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-[17px] font-semibold tracking-tight">{when.toFormat("cccc, LLLL d")}</Dialog.Title>
            <Dialog.Close className="rounded-full border border-[#e6e5df] px-3 py-1 text-sm">{t("common.close")}</Dialog.Close>
          </div>
          <label className="mt-4 block text-sm" htmlFor="booking-technician">
            <span className="mb-1 block text-xs font-medium tracking-wide text-[#6b6b64]">{t("booking.technician")}</span>
            <select
              id="booking-technician"
              className="w-full rounded-xl border border-[#e6e5df] bg-white px-3 py-2"
              value={techs.some((person) => person.id === staffId) ? staffId : "any"}
              onChange={(event) => {
                const nextStaff = event.target.value;
                setStaffId(nextStaff);
                const stillOpen = slots.some((slot) => slot.start === start && (nextStaff === "any" || slot.staffIds.includes(nextStaff)));
                if (!stillOpen) setStart("");
              }}
            >
              <option value="any">{t("booking.any")}</option>
              {techs.map((person) => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </label>
          <div className="mt-4">
            <p className="text-[15px] font-semibold">{t("booking.time")}</p>
            <p className="mt-1 text-xs text-[#6b6b64]">{t("booking.bookedHint")}</p>
            {grouped.length === 0 ? <p className="mt-2 text-sm text-[#6b6b64]">{t("booking.none")}</p> : null}
            <div className="mt-3 space-y-2">
              {grouped.map((group) => {
                const expanded = openGroups.includes(group.id);
                return (
                  <div key={group.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between py-1 text-[10px] font-semibold tracking-[0.16em] text-[#9b9b94]"
                      aria-expanded={expanded}
                      onClick={() => setOpenGroups((current) => (current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id]))}
                    >
                      {t(group.label).toUpperCase()}
                      <ChevronDown size={14} className={expanded ? "rotate-180" : ""} />
                    </button>
                    {expanded ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.times.map((time) => {
                          const pressed = chosen === time.start;
                          return (
                            <button
                              key={time.start}
                              type="button"
                              aria-pressed={time.available ? pressed : undefined}
                              aria-disabled={!time.available}
                              disabled={!time.available}
                              onClick={() => { if (time.available) setStart(time.start); }}
                              aria-label={time.available ? time.label : `${time.label}, ${t("booking.unavailable")}`}
                              className={`h-9 rounded-full border px-3 text-[13px] leading-none ${!time.available ? "border-transparent bg-transparent text-[#b7b7b0] line-through" : pressed ? "border-[#111] bg-[#111] text-white" : "border-[#e6e5df] bg-white text-[#111]"}`}
                            >
                              {time.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            className="btn-primary mt-4"
            disabled={!chosen}
            onClick={() => onConfirm({ start: chosen, staff: staffId })}
          >
            {t("booking.done")}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
