import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { generateSchedule, generateSlots, type SlotInput } from "@/lib/availability/slots";

const zone = "America/New_York";
const staffId = "33333333-3333-4333-8333-333333333333";

function input(overrides: Partial<SlotInput> = {}): SlotInput {
  return {
    rangeStart: new Date("2026-06-01T00:00:00.000Z"),
    rangeEnd: new Date("2026-06-08T00:00:00.000Z"),
    businessTimezone: zone,
    durationMinutes: 60,
    bufferBefore: 0,
    bufferAfter: 0,
    intervalMinutes: 60,
    minNoticeMinutes: 0,
    horizonDays: 365,
    now: new Date("2026-05-01T12:00:00.000Z"),
    closedDates: [],
    staff: [
      {
        id: staffId,
        timezone: zone,
        hours: [{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 }],
        overrides: [],
      },
    ],
    busy: [],
    staffFilter: "any",
    ...overrides,
  };
}

describe("generateSlots", () => {
  it("allows a back-to-back appointment and rejects a buffer overlap", () => {
    const open = generateSlots(
      input({
        busy: [{ staffId, start: "2026-06-01T13:00:00.000Z", end: "2026-06-01T14:00:00.000Z" }],
      }),
    );
    expect(open.map((slot) => slot.start)).toContain("2026-06-01T14:00:00.000Z");
    expect(open.map((slot) => slot.start)).not.toContain("2026-06-01T13:00:00.000Z");
    const schedule = generateSchedule(
      input({
        busy: [{ staffId, start: "2026-06-01T13:00:00.000Z", end: "2026-06-01T14:00:00.000Z" }],
      }),
    );
    expect(schedule.taken.map((slot) => slot.start)).toContain("2026-06-01T13:00:00.000Z");
    expect(schedule.slots.map((slot) => slot.start)).not.toContain("2026-06-01T13:00:00.000Z");

    const buffered = generateSlots(
      input({
        bufferAfter: 15,
        busy: [{ staffId, start: "2026-06-01T13:00:00.000Z", end: "2026-06-01T14:15:00.000Z" }],
      }),
    );
    expect(buffered.map((slot) => slot.start)).not.toContain("2026-06-01T14:00:00.000Z");
  });

  it("skips the nonexistent hour when clocks spring forward", () => {
    const slots = generateSlots(
      input({
        now: new Date("2026-03-01T12:00:00.000Z"),
        rangeStart: new Date("2026-03-08T00:00:00.000Z"),
        rangeEnd: new Date("2026-03-09T00:00:00.000Z"),
        durationMinutes: 30,
        intervalMinutes: 30,
        staff: [
          {
            id: staffId,
            timezone: zone,
            hours: [{ weekday: 0, startMinute: 60, endMinute: 4 * 60 }],
            overrides: [],
          },
        ],
      }),
    );
    const localHours = slots.map((slot) => DateTime.fromISO(slot.start, { zone: "utc" }).setZone(zone).hour);
    expect(localHours).not.toContain(2);
    expect(localHours).toContain(1);
    expect(localHours).toContain(3);
  });

  it("offers both real instants during the repeated fall-back hour", () => {
    const slots = generateSlots(
      input({
        now: new Date("2026-10-01T12:00:00.000Z"),
        rangeStart: new Date("2026-11-01T00:00:00.000Z"),
        rangeEnd: new Date("2026-11-02T00:00:00.000Z"),
        durationMinutes: 30,
        intervalMinutes: 30,
        staff: [
          {
            id: staffId,
            timezone: zone,
            hours: [{ weekday: 0, startMinute: 60, endMinute: 3 * 60 }],
            overrides: [],
          },
        ],
      }),
    );
    const oneThirties = slots.filter((slot) => {
      const local = DateTime.fromISO(slot.start, { zone: "utc" }).setZone(zone);
      return local.hour === 1 && local.minute === 30;
    });
    expect(oneThirties).toHaveLength(2);
    expect(new Set(oneThirties.map((slot) => slot.start)).size).toBe(2);
  });

  it("hides slots inside the minimum notice window", () => {
    const slots = generateSlots(
      input({
        now: new Date("2026-06-01T13:30:00.000Z"),
        minNoticeMinutes: 60,
      }),
    );
    expect(slots.map((slot) => slot.start)).not.toContain("2026-06-01T13:00:00.000Z");
    expect(slots.map((slot) => slot.start)).toContain("2026-06-01T15:00:00.000Z");
  });
});
