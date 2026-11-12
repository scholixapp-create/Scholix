import { BOOKING_TIME_ZONE } from "./bookingRequests";

export type CalendarTimelineSession = {
  id: number;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  lessonMode?: string | null;
  travelBufferMinutes?: number | null;
};

export type CalendarTimelineBlock<T extends CalendarTimelineSession> =
  | {
      kind: "session";
      id: string;
      startMinute: number;
      durationMinutes: number;
      session: T;
    }
  | {
      kind: "travel";
      id: string;
      startMinute: number;
      durationMinutes: number;
      fromSession: T;
      toSession: T;
    };

const MELBOURNE_DATE_TIME = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOOKING_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function localDateAndMinute(iso: string) {
  const parts = MELBOURNE_DATE_TIME.formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "0";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minute: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

function reservedTravelMinutes(session: CalendarTimelineSession) {
  if (session.lessonMode === "online") return 0;
  return Math.max(0, session.travelBufferMinutes ?? 0);
}

function travelGapMinutes(first: CalendarTimelineSession, second: CalendarTimelineSession) {
  if (first.lessonMode === "online" && second.lessonMode === "online") return 0;
  return Math.max(reservedTravelMinutes(first), reservedTravelMinutes(second));
}

export function buildDayTimeline<T extends CalendarTimelineSession>(
  sessions: readonly T[],
  dateKey: string,
): CalendarTimelineBlock<T>[] {
  const daySessions = sessions
    .filter((session) => ["scheduled", "completed", "pending_confirmation", "pending_payment"].includes(session.status))
    .map((session) => ({ session, ...localDateAndMinute(session.scheduledAt) }))
    .filter((item) => item.date === dateKey)
    .sort((a, b) => a.minute - b.minute || a.session.id - b.session.id);

  const blocks: CalendarTimelineBlock<T>[] = daySessions.map(({ session, minute }) => ({
    kind: "session",
    id: `session-${session.id}`,
    startMinute: minute,
    durationMinutes: session.durationMinutes,
    session,
  }));

  for (let index = 0; index < daySessions.length - 1; index += 1) {
    const first = daySessions[index];
    const second = daySessions[index + 1];
    if (!first || !second) continue;

    const durationMinutes = travelGapMinutes(first.session, second.session);
    if (durationMinutes <= 0) continue;

    blocks.push({
      kind: "travel",
      id: `travel-${first.session.id}-${second.session.id}`,
      startMinute: first.minute + first.session.durationMinutes,
      durationMinutes,
      fromSession: first.session,
      toSession: second.session,
    });
  }

  return blocks.sort((a, b) => a.startMinute - b.startMinute || (a.kind === "travel" ? -1 : 1));
}

export function calendarDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
