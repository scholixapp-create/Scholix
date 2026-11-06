// Pure scheduling rules shared by availability display and the locked booking write.
export type LessonMode = "online" | "in_person";
export const BOOKING_TIMEZONE = "Australia/Melbourne";
export type BookingRange = {
  scheduledAt: Date;
  durationMinutes: number;
  lessonMode: LessonMode;
  travelBufferMinutes: number;
};
export type WeeklyWindow = { dayOfWeek: number | null; startTime: string; endTime: string };

export class BookingError extends Error {
  constructor(message: string, readonly statusCode: 400 | 403 | 404 | 409 = 409) { super(message); }
}

function parts(date: Date, timezone: string) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
}
export function localDate(date: Date, timezone = BOOKING_TIMEZONE) {
  const p = parts(date, timezone);
  return `${p.year}-${p.month}-${p.day}`;
}
export function localTime(date: Date, timezone = BOOKING_TIMEZONE) {
  const p = parts(date, timezone);
  return `${p.hour}:${p.minute}`;
}
export function dayOfWeek(date: string) {
  const jsDay = new Date(`${date}T12:00:00Z`).getUTCDay();
  return (jsDay + 6) % 7;
}
export function minutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function clock(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export function validDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(`${date}T12:00:00Z`))
    && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}

// Resolve wall time with Intl's actual timezone rules, not a fixed AEST offset.
// Nonexistent spring-forward times are deliberately not bookable.
export function zonedInstant(date: string, time: string, timezone = BOOKING_TIMEZONE): Date | null {
  if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const wanted = Date.parse(`${date}T${time}:00Z`);
  let instant = wanted;
  for (let i = 0; i < 3; i++) {
    const p = parts(new Date(instant), timezone);
    const wall = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);
    instant += wanted - wall;
  }
  const result = new Date(instant);
  return localDate(result, timezone) === date && localTime(result, timezone) === time ? result : null;
}

export function travelGap(a: BookingRange, b: BookingRange) {
  if (a.lessonMode === "online" && b.lessonMode === "online") return 0;
  // Travel can be necessary before OR after an in-person lesson.
  return Math.max(a.lessonMode === "in_person" ? a.travelBufferMinutes : 0,
    b.lessonMode === "in_person" ? b.travelBufferMinutes : 0);
}
export function conflicts(a: BookingRange, b: BookingRange) {
  const [earlier, later] = a.scheduledAt <= b.scheduledAt ? [a, b] : [b, a];
  return earlier.scheduledAt.getTime() + (earlier.durationMinutes + travelGap(earlier, later)) * 60_000
    > later.scheduledAt.getTime();
}
export function generateSlots(input: {
  date: string; duration: number; mode: LessonMode; buffer: number;
  windows: WeeklyWindow[]; booked: BookingRange[]; now: Date;
}) {
  const { date, duration, mode, buffer, windows, booked, now } = input;
  const slotInstants: Record<string, string> = {};
  for (const w of windows.filter((w) => w.dayOfWeek === dayOfWeek(date))) {
    const end = zonedInstant(date, w.endTime);
    if (!end) continue;
    for (let m = Math.ceil(minutes(w.startTime) / 15) * 15; m + duration <= minutes(w.endTime); m += 15) {
      const time = clock(m);
      const start = zonedInstant(date, time);
      if (!start || start <= now || start.getTime() + duration * 60_000 > end.getTime()) continue;
      const range = { scheduledAt: start, durationMinutes: duration, lessonMode: mode, travelBufferMinutes: buffer };
      if (!booked.some((b) => conflicts(range, b))) slotInstants[time] = start.toISOString();
    }
  }
  const slots = Object.keys(slotInstants).sort();
  // Earliest-finish packing for equal-duration lessons. These are suggestions,
  // not a restriction: all remaining valid starts stay bookable.
  const suggested: BookingRange[] = [];
  const preferredSlots = slots.filter((time) => {
    const candidate = { scheduledAt: new Date(slotInstants[time]), durationMinutes: duration,
      lessonMode: mode, travelBufferMinutes: buffer };
    if (suggested.some((s) => conflicts(candidate, s))) return false;
    suggested.push(candidate);
    return true;
  });
  return { date, duration, slots, preferredSlots, slotInstants, timezone: BOOKING_TIMEZONE, lessonMode: mode };
}
