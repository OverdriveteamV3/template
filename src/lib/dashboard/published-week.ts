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
