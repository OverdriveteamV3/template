import { DateTime } from "luxon";

export function AppointmentSummary({ service, staff, start, timezone }: { service?: string; staff?: string; start?: string; timezone: string }) {
  if (!service || !start) return null;
  const when = DateTime.fromISO(start, { zone: "utc" }).setZone(timezone);
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 text-sm">
      <p className="font-semibold">{service}</p>
      <p>{when.toFormat("ccc, LLL d · h:mm a")}</p>
      <p className="text-muted">{staff ?? "Any available"} · {timezone.replaceAll("_", " ")}</p>
    </div>
  );
}
