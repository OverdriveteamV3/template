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
type Query = { service: string; staff: string; date: string; start: string; conflict: boolean };

export function BookingPanel({ site, today, frost = false, preview = false, serviceId = "" }: { site: PublicSite; today: string; compact?: boolean; frost?: boolean; preview?: boolean; serviceId?: string }) {
  if (preview) {
    return <BookingSurface site={site} today={today} frost={frost} query={{ service: serviceId, staff: "any", date: "", start: "", conflict: false }} onReplace={() => {}} onBook={() => {}} />;
  }
  return <LiveBooking site={site} today={today} frost={frost} serviceId={serviceId} />;
}

function LiveBooking({ site, today, frost, serviceId = "" }: { site: PublicSite; today: string; frost: boolean; serviceId?: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const query = {
    service: params.get("service") || serviceId,
    staff: params.get("staff") ?? "any",
    date: params.get("date") ?? "",
    start: params.get("start") ?? "",
    conflict: params.get("conflict") === "1",
  };

  function onReplace(next: Record<string, string | null>) {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) search.delete(key);
      else search.set(key, value);
    }
    router.replace(`?${search.toString()}`, { scroll: false });
  }

  function onBook(search: URLSearchParams) {
    router.push(`/book?${search.toString()}`);
  }

  return <BookingSurface site={site} today={today} frost={frost} query={query} onReplace={onReplace} onBook={onBook} search={params} />;
}

function BookingSurface({ site, today, frost, query, onReplace, onBook, search }: { site: PublicSite; today: string; frost: boolean; query: Query; onReplace: (next: Record<string, string | null>) => void; onBook: (search: URLSearchParams) => void; search?: URLSearchParams }) {
  const t = useT();
  const locale = useLocale();
  const zone = site.timezone;
  const staffId = query.staff || "any";
  const selectedDate = query.date || today;
  const [month, setMonth] = useState(() => DateTime.fromISO(selectedDate, { zone }).startOf("month"));
  const [result, setResult] = useState<Availability | null>(null);
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [pickedService, setPickedService] = useState<string | null>(null);
  const [choice, setChoice] = useState<{ date: string; start: string; staff: string } | null>(null);
  const serviceId = pickedService === null ? query.service || site.services[0]?.id || "" : pickedService;

  useEffect(() => {
    const controller = new AbortController();
    const from = month.startOf("month").toUTC().toISO();
    const to = month.endOf("month").plus({ days: 1 }).startOf("day").toUTC().toISO();
    if (!serviceId || !from || !to) return;
    const key = `${serviceId}|any|${from}|${to}`;
    const availability = new URLSearchParams({ serviceId, staffId: "any", from, to });
    fetch(`/api/availability?${availability}`, { signal: controller.signal, cache: "no-store" })
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
  const explicitInMonth = Boolean(query.date && monthDays.some((day) => day.toISODate() === query.date));
  const activeDate = dialogDate ?? (explicitInMonth ? query.date : "");
  const techs = site.staff.filter((person) => person.serviceIds.includes(serviceId));
  const onDialogDate = (slot: Slot) => DateTime.fromISO(slot.start, { zone: "utc" }).setZone(zone).toISODate() === dialogDate;
  const daySlots = slots.filter(onDialogDate);
  const dayTaken = taken.filter(onDialogDate);
  const saved = choice ?? (!query.conflict && explicitInMonth && query.start ? { date: query.date, start: query.start, staff: staffId } : null);
  const selection = saved && saved.date === activeDate && slots.some((slot) => slot.start === saved.start && (saved.staff === "any" || slot.staffIds.includes(saved.staff))) ? saved : null;

  return (
    <section className={`panel flex h-full min-h-[420px] flex-col p-4 ${frost ? "panel-frost relative z-10" : ""}`} aria-label="Book an appointment">
      <h2 className="text-[17px] font-extrabold tracking-tight">{t("booking.title")}</h2>
      <div className="mt-4 flex flex-1 flex-col">
        <div className="my-auto">
          <MonthNav label={month.setLocale(luxonLocale(locale)).toFormat("LLLL")} year={month.toFormat("yyyy")} onPrevious={() => setMonth(month.minus({ months: 1 }))} onNext={() => setMonth(month.plus({ months: 1 }))} />
          <div className="mt-3">
            <FullCalendar month={month} selected={activeDate} available={availableDates} onSelect={(date) => { setChoice(null); setDialogDate(date); onReplace({ date, start: null, conflict: null }); }} />
          </div>
          {query.conflict ? <div className="mt-4"><BookingState kind="conflict" timezone={zone} /></div> : null}
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
            const next = new URLSearchParams(search?.toString() ?? "");
            if (!next.get("service") && serviceId) next.set("service", serviceId);
            next.set("date", selection.date);
            next.set("start", selection.start);
            next.set("staff", selection.staff);
            next.delete("conflict");
            onBook(next);
          }}
        >
          {t("booking.bookNow")}
        </button>
        {dialogDate ? (
          <BookingDetails
            date={dialogDate}
            timezone={zone}
            services={site.services}
            serviceId={serviceId}
            techs={techs}
            slots={daySlots}
            taken={dayTaken}
            initialStaff={staffId}
            initialStart={selection?.date === dialogDate ? selection.start : ""}
            onService={(id) => {
              setPickedService(id);
              setChoice(null);
              onReplace({ service: id || null, start: null });
            }}
            onClose={() => setDialogDate(null)}
            onConfirm={(next) => {
              setPickedService(next.service);
              setChoice({ date: dialogDate, start: next.start, staff: next.staff });
              onReplace({ date: dialogDate, start: next.start, staff: next.staff, service: next.service, conflict: null });
              setDialogDate(null);
            }}
          />
        ) : null}
      </div>
    </section>
  );
}
