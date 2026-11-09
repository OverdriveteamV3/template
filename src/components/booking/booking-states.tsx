"use client";

import { useT } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const copy = {
  loading: "booking.loading",
  empty: "booking.empty",
  closed: "booking.closed",
  booked: "booking.taken",
  conflict: "booking.conflict",
  preview: "booking.preview",
} as const satisfies Record<string, MessageKey>;

export function BookingState({ kind, timezone }: { kind: keyof typeof copy; timezone?: string }) {
  const t = useT();
  return (
    <p role="status" className="rounded-xl bg-white px-3 py-2 text-sm text-muted">
      {t(copy[kind])}
      {timezone && kind !== "preview" ? ` ${t("booking.timesIn", { zone: timezone.replaceAll("_", " ") })}` : ""}
    </p>
  );
}
