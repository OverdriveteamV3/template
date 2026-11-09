"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookingPanel } from "@/components/booking/booking-panel";
import { useT } from "@/components/i18n/locale-provider";
import { SectionTitle } from "@/components/site/section-title";
import type { PublicService, PublicSite } from "@/lib/site/types";

const chartColors = ["var(--primary)", "#1f6b62", "#c6de45", "#d9d6cc"];

function serviceWeight(service: PublicService) {
  return service.showPrice && service.priceCents != null ? service.priceCents : service.durationMinutes;
}

function serviceValue(service: PublicService) {
  if (service.showPrice && service.priceCents != null) {
    const dollars = service.priceCents / 100;
    return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
  }
  return `${service.durationMinutes} min`;
}

export function ServiceChart({ services, preview = false, title, site, today }: { services: PublicService[]; preview?: boolean; title?: string; site: PublicSite; today: string }) {
  const t = useT();
  const router = useRouter();
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const active = hovered ?? selected;
  const chosen = services[selected] ?? services[0];
  const shown = services[active] ?? chosen;
  const weights = services.map(serviceWeight);
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const gap = 8;
  let cursor = 0;
  const segments = services.map((service, index) => {
    const span = (weights[index] / total) * circumference;
    const length = Math.max(span - gap, 1);
    const segment = { id: service.id, length, offset: cursor, color: chartColors[index % chartColors.length], active: index === active };
    cursor += span;
    return segment;
  });

  useEffect(() => {
    if (!calendarOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setCalendarOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [calendarOpen]);

  function book() {
    if (!chosen) return;
    if (!preview) {
      const query = new URLSearchParams(window.location.search);
      query.set("service", chosen.id);
      query.delete("start");
      query.delete("conflict");
      router.replace(`/?${query.toString()}`, { scroll: false });
    }
    setCalendarOpen(true);
  }

  if (!shown || !chosen) return null;

  return (
    <div>
      <SectionTitle>{title || t("home.services")}</SectionTitle>
      <div className="mt-8 flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-16">
        <div className="relative h-56 w-56 shrink-0">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden>
            {segments.map((segment) => (
              <circle key={segment.id} cx="70" cy="70" r={radius} fill="none" stroke={segment.color} strokeWidth="18" strokeDasharray={`${segment.length} ${circumference - segment.length}`} strokeDashoffset={-segment.offset} style={{ opacity: segment.active ? 1 : 0.28, transition: "opacity 180ms ease" }} />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-3xl font-semibold tracking-tight">{serviceValue(shown)}</p>
              <p className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-[#9b9b94]">{shown.durationMinutes} {t("common.min")}</p>
            </div>
          </div>
        </div>
        <ul className="grid w-full min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2" onMouseLeave={() => setHovered(null)}>
          {services.map((service, index) => {
            const pressed = index === selected;
            const lit = index === active;
            return (
              <li key={service.id}>
                <button
                  type="button"
                  aria-pressed={pressed}
                  onMouseEnter={() => setHovered(index)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  onClick={() => setSelected(index)}
                  className={`w-full rounded-[14px] border px-4 py-4 text-left transition ${lit ? "border-[#111] bg-white" : "border-transparent hover:bg-white/80"}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: chartColors[index % chartColors.length] }} />
                    <span className="font-semibold tracking-tight">{service.name}</span>
                    <span className="min-w-8 flex-1 border-b border-dotted border-[#c8c8c0]" />
                    <span className="tabular-nums font-semibold">{serviceValue(service)}</span>
                  </span>
                  {service.description ? <span className="mt-2 block pl-[22px] text-sm leading-relaxed text-muted">{service.description}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-8 flex justify-end">
        <button type="button" className="btn-primary !h-10 !w-auto !min-h-0 px-6 text-sm" onClick={book}>{t("booking.book")}</button>
      </div>
      {calendarOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-foreground/50 p-4" onClick={() => setCalendarOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={t("booking.title")} className="max-h-[85vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex justify-end">
              <button type="button" autoFocus onClick={() => setCalendarOpen(false)} className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold">{t("common.close")}</button>
            </div>
            <BookingPanel site={site} today={today} preview={preview} serviceId={chosen.id} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
