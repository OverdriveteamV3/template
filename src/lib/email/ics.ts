import { DateTime } from "luxon";

type IcsEvent = {
  uid: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
};

export function buildIcs(event: IcsEvent) {
  const start = DateTime.fromISO(event.startsAt, { zone: "utc" }).toUTC();
  const end = DateTime.fromISO(event.endsAt, { zone: "utc" }).toUTC();
  const stamp = DateTime.utc().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Over Drive//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start.toFormat("yyyyMMdd'T'HHmmss'Z'")}`,
    `DTEND:${end.toFormat("yyyyMMdd'T'HHmmss'Z'")}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(`${event.description} Times shown in ${event.timezone}.`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

function escapeText(value: string) {
  return value.replace(/[\r\n]+/g, " ").replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(";", "\\;");
}
