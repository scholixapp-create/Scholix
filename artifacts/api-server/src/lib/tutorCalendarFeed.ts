import { createHmac, timingSafeEqual } from "node:crypto";

const TIME_ZONE = "Australia/Melbourne";

export interface CalendarFeedSession {
  id: number;
  scheduledAt: Date;
  durationMinutes: number;
  status: string;
  requestExpiresAt: Date | null;
}

export interface CalendarFeedUnavailablePeriod {
  id: number;
  startDate: string;
  endDate: string;
}

export function createTutorCalendarToken(tutorId: number, version: number, secret: string): string {
  if (!secret || secret.length < 32) throw new Error("Calendar signing secret is unavailable.");
  return createHmac("sha256", secret)
    .update(`scholix-tutor-calendar-v1:${tutorId}:${version}`)
    .digest("base64url");
}

export function matchesTutorCalendarToken(candidate: unknown, expected: string): boolean {
  if (typeof candidate !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(candidate)) return false;
  const supplied = Buffer.from(candidate);
  const valid = Buffer.from(expected);
  return supplied.length === valid.length && timingSafeEqual(supplied, valid);
}

export function melbourneDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function formatUtcDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatIcsDate(date: string): string {
  return date.replace(/-/g, "");
}

function nextDate(date: string): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(line: string): string {
  let output = "";
  let current = "";
  let currentBytes = 0;
  for (const character of line) {
    const characterBytes = Buffer.byteLength(character, "utf8");
    if (currentBytes + characterBytes > 75) {
      output += `${current}\r\n `;
      current = character;
      currentBytes = characterBytes;
    } else {
      current += character;
      currentBytes += characterBytes;
    }
  }
  return output + current;
}

export function buildTutorCalendarIcs({
  tutorId,
  sessions,
  unavailablePeriods,
  now = new Date(),
}: {
  tutorId: number;
  sessions: CalendarFeedSession[];
  unavailablePeriods: CalendarFeedUnavailablePeriod[];
  now?: Date;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Scholix//Tutor Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Scholix Tutor Calendar",
  ];

  for (const session of sessions) {
    if (session.status !== "scheduled" && session.requestExpiresAt && session.requestExpiresAt <= now) continue;
    const start = new Date(session.scheduledAt);
    const end = new Date(start.getTime() + session.durationMinutes * 60_000);
    const pending = session.status !== "scheduled";
    lines.push(
      "BEGIN:VEVENT",
      `UID:scholix-tutor-${tutorId}-session-${session.id}@scholix.com.au`,
      `DTSTAMP:${formatUtcDateTime(now)}`,
      `DTSTART:${formatUtcDateTime(start)}`,
      `DTEND:${formatUtcDateTime(end)}`,
      `SUMMARY:${escapeIcsText("Scholix lesson")}`,
      `DESCRIPTION:${escapeIcsText("Lesson scheduled in Scholix.")}`,
      `STATUS:${pending ? "TENTATIVE" : "CONFIRMED"}`,
      "CLASS:PRIVATE",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }

  const today = melbourneDateKey(now);
  for (const period of unavailablePeriods) {
    if (period.endDate < today) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:scholix-tutor-${tutorId}-unavailable-${period.id}@scholix.com.au`,
      `DTSTAMP:${formatUtcDateTime(now)}`,
      `DTSTART;VALUE=DATE:${formatIcsDate(period.startDate)}`,
      `DTEND;VALUE=DATE:${formatIcsDate(nextDate(period.endDate))}`,
      `SUMMARY:${escapeIcsText("Unavailable")}`,
      "STATUS:CONFIRMED",
      "CLASS:PRIVATE",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
