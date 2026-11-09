import { describe, expect, it } from "vitest";
import { csvCell } from "@/lib/email/escape";
import { buildIcs } from "@/lib/email/ics";

describe("email formatting", () => {
  it("builds a UTC calendar event without raw newlines", () => {
    const ics = buildIcs({
      uid: "appt-1@overdrive",
      title: "Cut\nColor",
      description: "See you there",
      startsAt: "2026-06-01T14:00:00.000Z",
      endsAt: "2026-06-01T15:00:00.000Z",
      timezone: "America/New_York",
    });
    expect(ics).toContain("DTSTART:20260601T140000Z");
    expect(ics).toContain("SUMMARY:Cut Color");
    expect(ics.split("\n").some((line) => line.startsWith("SUMMARY:") && line.includes("\n"))).toBe(false);
  });

  it("guards spreadsheet formulas", () => {
    expect(csvCell("=cmd")).toBe(`"'=cmd"`);
    expect(csvCell("Ada")).toBe(`"Ada"`);
  });
});
