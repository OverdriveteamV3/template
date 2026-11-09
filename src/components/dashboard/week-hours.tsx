"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

export type WeekDay = {
  key: MessageKey;
  start: number | null;
  end: number | null;
  minutes: number;
};

export type WeekAppointment = {
  id: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  status: string;
};

function shortClock(minute: number, locale: string) {
  const hours = Math.floor(minute / 60);
  const mins = minute % 60;
  if (locale === "es") return mins ? `${hours}:${String(mins).padStart(2, "0")}` : String(hours);
  const display = hours % 12 || 12;
  const suffix = hours < 12 ? "a" : "p";
  return `${mins ? `${display}:${String(mins).padStart(2, "0")}` : display}${suffix}`;
}

function clock(iso: string, locale: string, zone: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es" : "en", { hour: "numeric", minute: "2-digit", timeZone: zone }).format(new Date(iso));
}

export function WeekHours({ locale, zone, days, appointments }: { locale: string; zone: string; days: WeekDay[]; appointments: WeekAppointment[] | null }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const longest = Math.max(...days.map((day) => day.minutes), 1);
  const day = open == null ? null : days[open];
  const items = open == null || !appointments ? [] : appointments.filter((item) => item.weekday === open);

  useEffect(() => {
    if (open == null) return;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((item, weekday) => (
          <button key={item.key} type="button" className="flex flex-col items-center rounded-md hover:bg-white" aria-haspopup="dialog" onClick={() => setOpen(weekday)}>
            <div className="flex h-28 w-full items-end">
              <div className="w-full rounded-t-md rounded-b-sm" style={{ height: `${item.minutes ? Math.max((item.minutes / longest) * 100, 12) : 8}%`, background: item.minutes ? "var(--primary)" : "var(--border)" }} />
            </div>
            <p className="mt-2 text-[11px] font-semibold">{t(item.key)}</p>
            <p className="mt-0.5 whitespace-nowrap text-center text-[10px] leading-tight text-muted">
              {item.start != null && item.end != null ? t("dash.range", { start: shortClock(item.start, locale), end: shortClock(item.end, locale) }) : t("dash.closed")}
            </p>
          </button>
        ))}
      </div>
      {day ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-sm rounded-[16px] border border-border bg-white p-5 shadow-[0_24px_60px_rgba(17,17,17,0.16)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id={titleId} className="text-lg font-semibold">{t(day.key)}</h3>
                <p className="mt-1 text-sm text-muted">
                  {day.start != null && day.end != null ? t("dash.range", { start: shortClock(day.start, locale), end: shortClock(day.end, locale) }) : t("dash.closed")}
                </p>
              </div>
              <button ref={closeRef} type="button" className="rounded-full px-2 py-1 text-sm text-muted hover:bg-surface" onClick={() => setOpen(null)}>{t("common.close")}</button>
            </div>
            <h4 className="mt-4 text-sm font-semibold">{t("dash.appointments")}</h4>
            {appointments == null ? <p className="mt-2 text-sm text-muted">{t("dash.calendarWait")}</p> : items.length === 0 ? <p className="mt-2 text-sm text-muted">{t("dash.noDayAppointments")}</p> : (
              <ul className="mt-2 divide-y divide-border text-sm">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                    <span>{t("dash.range", { start: clock(item.startsAt, locale, zone), end: clock(item.endsAt, locale, zone) })}</span>
                    <span className="text-muted">{item.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
