import type { Session } from "@workspace/api-client-react";
import { format } from "date-fns";
import { MapPin, Video } from "lucide-react";
import { BOOKING_TIME_ZONE } from "@/lib/bookingRequests";
import { buildDayTimeline, calendarDateKey } from "@/lib/calendarTimeline";

const HOUR_HEIGHT = 60;
const WEEK_MIN_WIDTH = 54 + 7 * 128;

const TIME_PARTS = new Intl.DateTimeFormat("en-AU", {
  timeZone: BOOKING_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

type AvailabilityWindow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type UnavailablePeriod = {
  startDate: string;
  endDate: string;
};

function sessionMinute(iso: string) {
  const parts = TIME_PARTS.formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "0";
  let hour = Number(value("hour"));
  if (hour === 12 && parts.find((part) => part.type === "dayPeriod")?.value.toLowerCase() === "am") hour = 0;
  if (hour !== 12 && parts.find((part) => part.type === "dayPeriod")?.value.toLowerCase() === "pm") hour += 12;
  return hour * 60 + Number(value("minute"));
}

function formatMinute(minute: number) {
  return new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit" })
    .format(new Date(2000, 0, 1, Math.floor(minute / 60), minute % 60));
}

function timeOfDay(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function mondayFirstWeekday(date: Date) {
  return (date.getDay() + 6) % 7;
}

function unavailableOnDate(dateKey: string, periods: UnavailablePeriod[]) {
  return periods.some((period) => dateKey >= period.startDate && dateKey <= period.endDate);
}

function statusClasses(session: Session) {
  if (session.status === "pending_confirmation" || session.status === "pending_payment") {
    return "border-amber-500/30 bg-amber-50 text-amber-950";
  }
  if (session.status === "completed") return "border-border bg-muted text-muted-foreground";
  return "border-primary/25 bg-primary/10 text-primary";
}

export default function WeeklyTutorCalendarView({
  days,
  sessions,
  availability,
  unavailablePeriods,
  selectedDate,
  onSelectDate,
}: {
  days: Date[];
  sessions: Session[];
  availability: AvailabilityWindow[];
  unavailablePeriods: UnavailablePeriod[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const dayData = days.map((date) => {
    const key = calendarDateKey(date);
    const windows = unavailableOnDate(key, unavailablePeriods)
      ? []
      : availability.filter((window) => window.dayOfWeek === mondayFirstWeekday(date));
    return {
      date,
      key,
      windows,
      unavailable: unavailableOnDate(key, unavailablePeriods),
      blocks: buildDayTimeline(sessions, key),
    };
  });

  const earliestMinute = Math.min(
    7 * 60,
    ...dayData.flatMap(({ windows, blocks }) => [
      ...windows.map((window) => timeOfDay(window.startTime)),
      ...blocks.map((block) => block.startMinute),
    ]),
  );
  const latestMinute = Math.max(
    21 * 60,
    ...dayData.flatMap(({ windows, blocks }) => [
      ...windows.map((window) => timeOfDay(window.endTime)),
      ...blocks.map((block) => block.startMinute + block.durationMinutes),
    ]),
  );
  const startHour = Math.max(0, Math.floor(earliestMinute / 60));
  const endHour = Math.min(24, Math.ceil(latestMinute / 60));
  const hourCount = Math.max(1, endHour - startHour);
  const totalHeight = hourCount * HOUR_HEIGHT;
  const hours = Array.from({ length: hourCount + 1 }, (_, index) => startHour + index);
  const selectedKey = calendarDateKey(selectedDate);

  return (
    <div className="min-w-0" data-testid="calendar-week-view">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
        <span>Blocks use Melbourne time. Travel shows the protected buffer, not live traffic.</span>
        <span className="sm:hidden">Scroll sideways to see the full week.</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border" role="region" aria-label="Weekly tutor schedule">
        <div style={{ minWidth: WEEK_MIN_WIDTH }}>
          <div className="grid grid-cols-[54px_repeat(7,minmax(128px,1fr))] border-b border-border bg-muted/25">
            <div aria-hidden="true" />
            {dayData.map(({ date, key, unavailable, blocks }) => (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDate(date)}
                aria-label={`Select ${format(date, "EEEE d MMMM")}${blocks.some((block) => block.kind === "session") ? ", has lessons" : ""}${unavailable ? ", unavailable" : ""}`}
                aria-pressed={key === selectedKey}
                className={`min-w-0 border-l border-border px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                  key === selectedKey ? "bg-primary/5" : ""
                }`}
                data-testid={`button-week-day-${key}`}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{format(date, "EEE")}</span>
                <span className="mt-0.5 flex items-center justify-between gap-1 text-sm font-semibold text-foreground">
                  {format(date, "d")}
                  {blocks.some((block) => block.kind === "session") && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Has lessons" />}
                </span>
                {unavailable && <span className="mt-0.5 block truncate text-[9px] font-medium text-destructive">Unavailable</span>}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[54px_repeat(7,minmax(128px,1fr))]">
            <div className="relative" style={{ height: totalHeight }}>
              {hours.map((hour) => (
                <span
                  key={hour}
                  className="absolute right-1 -translate-y-1/2 text-[9px] text-muted-foreground"
                  style={{ top: (hour - startHour) * HOUR_HEIGHT }}
                >
                  {formatMinute(hour * 60)}
                </span>
              ))}
            </div>
            {dayData.map(({ key, windows, unavailable, blocks }) => (
              <div
                key={key}
                className={`relative border-l border-border ${unavailable ? "bg-destructive/[0.035]" : ""}`}
                style={{ height: totalHeight }}
                data-testid={`timeline-day-${key}`}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 border-t border-border/70"
                    style={{ top: (hour - startHour) * HOUR_HEIGHT }}
                  />
                ))}
                {windows.map((window, index) => {
                  const top = (timeOfDay(window.startTime) - startHour * 60) / 60 * HOUR_HEIGHT;
                  const height = (timeOfDay(window.endTime) - timeOfDay(window.startTime)) / 60 * HOUR_HEIGHT;
                  return (
                    <div
                      key={`${window.dayOfWeek}-${window.startTime}-${index}`}
                      title={`Available ${formatMinute(timeOfDay(window.startTime))} to ${formatMinute(timeOfDay(window.endTime))}`}
                      aria-label={`Available from ${formatMinute(timeOfDay(window.startTime))} to ${formatMinute(timeOfDay(window.endTime))}`}
                      className="absolute inset-x-1 z-0 rounded-md border border-accent/10 bg-accent/[0.07]"
                      style={{ top, height }}
                    />
                  );
                })}
                {blocks.map((block) => {
                  const top = (block.startMinute - startHour * 60) / 60 * HOUR_HEIGHT;
                  const height = block.durationMinutes / 60 * HOUR_HEIGHT;
                  if (block.kind === "travel") {
                    return (
                      <div
                        key={block.id}
                        title={`${block.durationMinutes}-minute protected travel buffer between lessons`}
                        aria-label={`${block.durationMinutes}-minute travel buffer`}
                        className="absolute inset-x-1 z-20 flex items-center overflow-hidden rounded border border-dashed border-amber-600/45 bg-amber-50/95 px-1 text-[9px] font-semibold leading-none text-amber-950"
                        style={{ top, height: Math.max(14, height) }}
                        data-testid={`calendar-week-travel-${block.fromSession.id}-${block.toSession.id}`}
                      >
                        <MapPin size={10} className="mr-1 shrink-0" />
                        <span className="truncate">Travel · {block.durationMinutes}m</span>
                      </div>
                    );
                  }

                  const { session } = block;
                  return (
                    <article
                      key={block.id}
                      title={`${session.subject}: ${formatMinute(block.startMinute)} to ${formatMinute(block.startMinute + block.durationMinutes)} (${block.durationMinutes} minutes)`}
                      aria-label={`${session.subject}, ${formatMinute(block.startMinute)} to ${formatMinute(block.startMinute + block.durationMinutes)}, ${block.durationMinutes} minutes`}
                      className={`absolute inset-x-1 z-30 overflow-hidden rounded-md border px-1.5 py-1 text-[9px] shadow-sm ${statusClasses(session)}`}
                      style={{ top, height: Math.max(24, height) }}
                      data-testid={`calendar-week-session-${session.id}`}
                    >
                      <p className="truncate font-semibold">{session.subject}</p>
                      <p className="truncate leading-tight">
                        {formatMinute(block.startMinute)} · {block.durationMinutes}m
                        {session.lessonMode && (
                          <span className="ml-1 inline-flex items-center align-middle">
                            {session.lessonMode === "online" ? <Video size={9} /> : <MapPin size={9} />}
                          </span>
                        )}
                      </p>
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-border px-1 pt-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-primary" /> Booked lesson</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-amber-300" /> Pending request</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-accent/30 bg-accent/15" /> Available hours</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-dashed border-amber-600/60 bg-amber-50" /> Travel buffer</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-destructive/20" /> Unavailable day</span>
      </div>
    </div>
  );
}
