"use client";

import { useLocale, useT } from "@/components/i18n/locale-provider";
import { luxonLocale } from "@/lib/i18n/locale";
import { DateTime } from "luxon";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Slot } from "@/lib/availability/slots";
import type { PublicSite } from "@/lib/site/types";
import { BookingDetails } from "@/components/booking/booking-details";
import { BookingState } from "@/components/booking/booking-states";
import { FullCalendar } from "@/components/booking/full-calendar";
import { MonthNav } from "@/components/booking/month-nav";

const emptySlots: Slot[] = [];
type Availability = { key: string; slots: Slot[]; taken: Slot[]; status: "ready" | "error" };

export function BookingPanel({ site, today, frost = false }: { site: PublicSite; today: string; compact?: boolean; frost?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const params = useSearchParams();
  const router = useRouter();
  const zone = site.timezone;
  const serviceId = params.get("service") ?? site.services[0]?.id ?? "";
  const staffId = params.get("staff") ?? "any";
  const selectedDate = params.get("date") ?? today;
  const selectedStart = params.get("start") ?? "";
  const [month, setMonth] = useState(() => DateTime.fromISO(selectedDate, { zone }).startOf("month"));
  const [result, setResult] = useState<Availability | null>(null);
  const conflict = params.get("conflict") === "1";
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [choice, setChoice] = useState<{ date: string; start: string; staff: string } | null>(null);

  function replace(next: Record<string, string | null>) {
    const query = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) query.delete(key);
      else query.set(key, value);
    }
    router.replace(`?${query.toString()}`, { scroll: false });
  }

  useEffect(() => {
    const controller = new AbortController();
    const from = month.startOf("month").toUTC().toISO();
    const to = month.endOf("month").plus({ days: 1 }).startOf("day").toUTC().toISO();
    if (!serviceId || !from || !to) return;
    const key = `${serviceId}|any|${from}|${to}`;
    const query = new URLSearchParams({ serviceId, staffId: "any", from, to });
    fetch(`/api/availability?${query}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => response.json())
      .then((body: { slots?: Slot[]; taken?: Slot[] }) => {
        setResult({ key, slots: body.slots ?? [], taken: body.taken ?? [], status: "ready" });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResult({ key, slots: [], taken: [], status: "error" });
      });
    return () => controller.abort();
  }, [month, serviceId]);

  const requestKey = `${serviceId}|any|${month.startOf("month").toUTC().toISO()}|${month.endOf("month").plus({ days: 1 }).startOf("day").toUTC().toISO()}`;
  const slots = result?.key === requestKey ? result.slots : emptySlots;
  const taken = result?.key === requestKey ? result.taken : emptySlots;
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    for (const slot of slots) {
      const iso = DateTime.fromISO(slot.start, { zone: "utc" }).setZone(zone).toISODate();
      if (iso) dates.add(iso);
    }
    return dates;
  }, [slots, zone]);

  const monthDays = Array.from({ length: month.daysInMonth ?? 30 }, (_, index) => month.startOf("month").plus({ days: index }));
  const explicitDate = params.get("date");
  const explicitInMonth = Boolean(explicitDate && monthDays.some((day) => day.toISODate() === explicitDate));
  const activeDate = dialogDate ?? (explicitInMonth ? explicitDate ?? "" : "");
  const techs = site.staff.filter((person) => person.serviceIds.includes(serviceId));
  const onDialogDate = (slot: Slot) => DateTime.fromISO(slot.start, { zone: "utc" }).setZone(zone).toISODate() === dialogDate;
  const daySlots = slots.filter(onDialogDate);
  const dayTaken = taken.filter(onDialogDate);
  const saved = choice ?? (!conflict && explicitInMonth && selectedStart ? { date: explicitDate ?? "", start: selectedStart, staff: staffId } : null);
  const selection = saved && saved.date === activeDate && slots.some((slot) => slot.start === saved.start && (saved.staff === "any" || slot.staffIds.includes(saved.staff))) ? saved : null;

  return (
    <section className={`panel flex h-full min-h-[420px] flex-col p-4 ${frost ? "panel-frost backdrop-blur-xl" : ""}`} aria-label="Book an appointment">
      <h2 className="text-[17px] font-extrabold tracking-tight">{t("booking.title")}</h2>
      <div className="mt-4 flex flex-1 flex-col">
        <div className="my-auto">
          <MonthNav label={month.setLocale(luxonLocale(locale)).toFormat("LLLL")} year={month.toFormat("yyyy")} onPrevious={() => setMonth(month.minus({ months: 1 }))} onNext={() => setMonth(month.plus({ months: 1 }))} />
          <div className="mt-3">
            <FullCalendar month={month} selected={activeDate} available={availableDates} onSelect={(date) => { setChoice(null); setDialogDate(date); replace({ date, start: null, conflict: null }); }} />
          </div>
          {conflict ? <div className="mt-4"><BookingState kind="conflict" timezone={zone} /></div> : null}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">{t("booking.accountRequired")}</p>
        <button
          type="button"
          className="btn-primary mt-3"
          aria-disabled={!activeDate}
          onClick={() => {
            if (!activeDate) return;
            if (!selection) {
              setDialogDate(activeDate);
              return;
            }
            const query = new URLSearchParams(params.toString());
            if (!query.get("service") && serviceId) query.set("service", serviceId);
            query.set("date", selection.date);
            query.set("start", selection.start);
            query.set("staff", selection.staff);
            query.delete("conflict");
            router.push(`/book?${query.toString()}`);
          }}
        >
          {t("booking.bookNow")}
        </button>
        {dialogDate ? (
          <BookingDetails
            date={dialogDate}
            timezone={zone}
            techs={techs}
            slots={daySlots}
            taken={dayTaken}
            initialStaff={staffId}
            initialStart={selection?.date === dialogDate ? selection.start : ""}
            onClose={() => setDialogDate(null)}
            onConfirm={(next) => {
              setChoice({ date: dialogDate, start: next.start, staff: next.staff });
              replace({ date: dialogDate, start: next.start, staff: next.staff, conflict: null });
              setDialogDate(null);
            }}
          />
        ) : null}
      </div>
    </section>
  );
}
