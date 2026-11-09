import { DateTime } from "luxon";

export type HoursWindow = { weekday: number; startMinute: number; endMinute: number };
export type DateOverride = {
  date: string;
  kind: "closed" | "custom_hours";
  startMinute?: number | null;
  endMinute?: number | null;
};

export type StaffSchedule = {
  id: string;
  timezone: string;
  hours: HoursWindow[];
  overrides: DateOverride[];
};

export type BusySpan = { staffId: string; start: string; end: string };

export type SlotInput = {
  rangeStart: Date;
  rangeEnd: Date;
  businessTimezone: string;
  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;
  intervalMinutes: number;
  minNoticeMinutes: number;
  horizonDays: number;
  now: Date;
  closedDates: string[];
  staff: StaffSchedule[];
  busy: BusySpan[];
  staffFilter: string | "any";
};

export type Slot = { start: string; end: string; staffIds: string[] };

function toSlots(grouped: Map<string, { end: string; staffIds: Set<string> }>): Slot[] {
  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([start, value]) => ({ start, end: value.end, staffIds: [...value.staffIds].sort() }));
}

export function generateSchedule(input: SlotInput): { slots: Slot[]; taken: Slot[] } {
  const now = DateTime.fromJSDate(input.now, { zone: "utc" });
  const noticeCutoff = now.plus({ minutes: input.minNoticeMinutes });
  const horizonEnd = now.setZone(input.businessTimezone).startOf("day").plus({ days: input.horizonDays });
  const rangeStart = DateTime.fromJSDate(input.rangeStart, { zone: "utc" });
  const rangeEnd = DateTime.fromJSDate(input.rangeEnd, { zone: "utc" });
  const staff = input.staffFilter === "any" ? input.staff : input.staff.filter((person) => person.id === input.staffFilter);
  const open = new Map<string, { end: string; staffIds: Set<string> }>();
  const taken = new Map<string, { end: string; staffIds: Set<string> }>();

  for (const person of staff) {
    let day = rangeStart.setZone(person.timezone).startOf("day");
    const last = rangeEnd.setZone(person.timezone).startOf("day");
    for (; day <= last; day = day.plus({ days: 1 })) {
      for (const window of windowsFor(person, day)) {
        for (const instant of instantsInWindow(day, window, input.intervalMinutes, input.durationMinutes)) {
          const businessDate = instant.setZone(input.businessTimezone).toISODate();
          if (!businessDate || input.closedDates.includes(businessDate)) continue;
          if (instant.setZone(input.businessTimezone).startOf("day") > horizonEnd) continue;
          if (instant < noticeCutoff) continue;
          if (instant < rangeStart || instant >= rangeEnd) continue;
          const holdStart = instant.minus({ minutes: input.bufferBefore });
          const holdEnd = instant.plus({ minutes: input.durationMinutes + input.bufferAfter });
          const start = instant.toUTC().toISO();
          const end = instant.plus({ minutes: input.durationMinutes }).toUTC().toISO();
          if (!start || !end) continue;
          const bucket = overlapsBusy(person.id, holdStart, holdEnd, input.busy) ? taken : open;
          const existing = bucket.get(start);
          if (existing) existing.staffIds.add(person.id);
          else bucket.set(start, { end, staffIds: new Set([person.id]) });
        }
      }
    }
  }

  return { slots: toSlots(open), taken: toSlots(taken) };
}

export function generateSlots(input: SlotInput): Slot[] {
  return generateSchedule(input).slots;
}

export function periodFor(iso: string, timezone: string) {
  const hour = DateTime.fromISO(iso, { zone: "utc" }).setZone(timezone).hour;
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

function windowsFor(staff: StaffSchedule, day: DateTime): [number, number][] {
  const date = day.toISODate();
  const override = staff.overrides.find((item) => item.date === date);
  if (override?.kind === "closed") return [];
  if (override?.kind === "custom_hours" && override.startMinute != null && override.endMinute != null) {
    return [[override.startMinute, override.endMinute]];
  }
  const weekday = day.weekday % 7;
  return staff.hours.filter((item) => item.weekday === weekday).map((item) => [item.startMinute, item.endMinute]);
}

function instantsInWindow(day: DateTime, window: [number, number], interval: number, duration: number) {
  const [startMinute, endMinute] = window;
  const instants: DateTime[] = [];
  for (let minute = startMinute; minute + duration <= endMinute; minute += interval) {
    const hour = Math.floor(minute / 60);
    const mins = minute % 60;
    instants.push(...wallInstants(day, hour, mins));
  }
  return instants;
}

function wallInstants(day: DateTime, hour: number, minute: number) {
  const local = { year: day.year, month: day.month, day: day.day, hour, minute, second: 0 };
  const zone = day.zone;
  const noon = DateTime.fromObject({ ...local, hour: 12, minute: 0 }, { zone });
  const offsets = new Set<number>([noon.offset, noon.minus({ days: 1 }).offset, noon.plus({ days: 1 }).offset]);
  for (const offset of [...offsets]) {
    offsets.add(offset - 60);
    offsets.add(offset + 60);
  }
  const found = new Map<number, DateTime>();
  for (const offset of offsets) {
    const utc = DateTime.fromObject(local, { zone: "utc" }).minus({ minutes: offset });
    const zoned = utc.setZone(zone);
    if (sameWallTime(zoned, local)) found.set(zoned.toMillis(), zoned);
  }
  return [...found.values()].sort((a, b) => a.toMillis() - b.toMillis());
}

function sameWallTime(value: DateTime, local: { year: number; month: number; day: number; hour: number; minute: number }) {
  return value.isValid && value.year === local.year && value.month === local.month && value.day === local.day && value.hour === local.hour && value.minute === local.minute;
}

function overlapsBusy(staffId: string, start: DateTime, end: DateTime, busy: BusySpan[]) {
  const startMs = start.toMillis();
  const endMs = end.toMillis();
  return busy.some((span) => {
    if (span.staffId !== staffId) return false;
    const busyStart = DateTime.fromISO(span.start, { zone: "utc" }).toMillis();
    const busyEnd = DateTime.fromISO(span.end, { zone: "utc" }).toMillis();
    return startMs < busyEnd && endMs > busyStart;
  });
}
