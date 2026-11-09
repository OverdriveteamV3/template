import { DateTime } from "luxon";
import type { MessageKey } from "@/lib/i18n/messages";
import type { PublicSite } from "@/lib/site/types";

const dayKeys = ["dash.sun", "dash.mon", "dash.tue", "dash.wed", "dash.thu", "dash.fri", "dash.sat"] as const satisfies readonly MessageKey[];

export function publishedDays(site: PublicSite) {
  return dayKeys.map((key, weekday) => {
    const windows = site.staff.flatMap((person) => person.hours.filter((item) => item.weekday === weekday));
    if (windows.length === 0) return { key, start: null, end: null, minutes: 0 };
    const start = Math.min(...windows.map((item) => item.startMinute));
    const end = Math.max(...windows.map((item) => item.endMinute));
    return { key, start, end, minutes: Math.max(end - start, 0) };
  });
}

export function openDaysInMonth(site: PublicSite, now: DateTime) {
  const month = now.setZone(site.timezone).startOf("month");
  const pattern = publishedDays(site);
  const closed = new Set(site.closedDates.map((date) => date.slice(0, 10)));
  let count = 0;
  for (let day = month; day.month === month.month && day.year === month.year; day = day.plus({ days: 1 })) {
    const weekday = day.weekday % 7;
    if (pattern[weekday].minutes <= 0) continue;
    const iso = day.toISODate();
    if (!iso || closed.has(iso)) continue;
    const open = site.staff.some((person) => {
      const works = person.hours.some((item) => item.weekday === weekday && item.endMinute > item.startMinute);
      if (!works) return false;
      const override = person.overrides.find((item) => item.date.slice(0, 10) === iso);
      if (!override) return true;
      if (override.kind === "closed") return false;
      return (override.endMinute ?? 0) > (override.startMinute ?? 0);
    });
    if (open) count += 1;
  }
  return count;
}
