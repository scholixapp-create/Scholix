import { useMemo, useState, type ComponentProps } from "react";
import { useGetTutorAvailability, useGetTutorUnavailablePeriods, getGetTutorAvailabilityQueryKey, getGetTutorUnavailablePeriodsQueryKey } from "@workspace/api-client-react";
import type { Session } from "@workspace/api-client-react";
import { Calendar as CalendarIcon, Clock3, RotateCw, ShieldAlert, Video, MapPin, ChevronRight } from "lucide-react";
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import CalendarSubscriptionControl from "@/components/tutor/CalendarSubscriptionControl";
import { BOOKING_TIME_ZONE } from "@/lib/bookingRequests";
import { DayButton } from "react-day-picker";

const MELBOURNE_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOOKING_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentMelbourneDate() {
  const parts = MELBOURNE_DATE.formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return new Date(Number(part("year")), Number(part("month")) - 1, Number(part("day")), 12);
}

function mondayFirstWeekday(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

function dayButtonTestId(props: ComponentProps<typeof DayButton>) {
  return `button-calendar-day-${dateKey(props.day.date)}`;
}

function formatWindowTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, hour, minute);
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatSessionTime(iso: string) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: BOOKING_TIME_ZONE,
    timeZoneName: "short",
  }).format(new Date(iso));
}

function sessionStatus(session: Session) {
  if (session.status === "scheduled") return { label: "Booked", className: "bg-primary/10 text-primary" };
  if (session.status === "completed") return { label: "Complete", className: "bg-muted text-muted-foreground" };
  if (session.status === "pending_confirmation") return { label: "Request pending", className: "bg-amber-100 text-amber-900" };
  return session.tutorConfirmedAt
    ? { label: "Awaiting parent", className: "bg-amber-100 text-amber-900" }
    : { label: "Checkout pending", className: "bg-amber-100 text-amber-900" };
}

export default function TutorSessionsCalendar({
  tutorId,
  sessions,
  sessionsLoading,
  sessionsError,
  onRetrySessions,
}: {
  tutorId?: number;
  sessions: Session[];
  sessionsLoading: boolean;
  sessionsError: boolean;
  onRetrySessions: () => void;
}) {
  const availability = useGetTutorAvailability(tutorId ?? 0, {
    query: {
      enabled: !!tutorId,
      queryKey: getGetTutorAvailabilityQueryKey(tutorId ?? 0),
    },
  });
  const unavailable = useGetTutorUnavailablePeriods(tutorId ?? 0, {
    query: {
      enabled: !!tutorId,
      queryKey: getGetTutorUnavailablePeriodsQueryKey(tutorId ?? 0),
    },
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => currentMelbourneDate());
  const [month, setMonth] = useState<Date>(() => currentMelbourneDate());

  const visibleDates = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const days: Date[] = [];
    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) days.push(cursor);
    return days;
  }, [month]);

  const scheduledSessions = useMemo(
    () => sessions.filter((session) => session.status === "scheduled" || session.status === "completed"),
    [sessions],
  );
  const pendingSessions = useMemo(
    () => sessions.filter((session) => session.status === "pending_confirmation" || session.status === "pending_payment"),
    [sessions],
  );
  const bookedDates = useMemo(() => {
    const keys = new Set(scheduledSessions.map((session) => MELBOURNE_DATE.format(new Date(session.scheduledAt))));
    return visibleDates.filter((date) => keys.has(dateKey(date)));
  }, [scheduledSessions, visibleDates]);
  const pendingDates = useMemo(() => {
    const keys = new Set(pendingSessions.map((session) => MELBOURNE_DATE.format(new Date(session.scheduledAt))));
    return visibleDates.filter((date) => keys.has(dateKey(date)));
  }, [pendingSessions, visibleDates]);
  const availableDates = useMemo(() => {
    const dayIndexes = new Set((availability.data ?? []).map((slot) => slot.dayOfWeek));
    const periods = unavailable.data ?? [];
    return visibleDates.filter((date) => {
      const key = dateKey(date);
      return dayIndexes.has(mondayFirstWeekday(key))
        && !periods.some((period) => key >= period.startDate && key <= period.endDate);
    });
  }, [availability.data, unavailable.data, visibleDates]);
  const unavailableDates = useMemo(() => {
    const periods = unavailable.data ?? [];
    return visibleDates.filter((date) => {
      const key = dateKey(date);
      return periods.some((period) => key >= period.startDate && key <= period.endDate);
    });
  }, [unavailable.data, visibleDates]);

  const selectedKey = dateKey(selectedDate);
  const selectedSessions = [...scheduledSessions, ...pendingSessions]
    .filter((session) => MELBOURNE_DATE.format(new Date(session.scheduledAt)) === selectedKey)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const selectedWeekday = mondayFirstWeekday(selectedKey);
  const selectedWindows = (availability.data ?? []).filter((slot) => slot.dayOfWeek === selectedWeekday);
  const selectedPeriods = (unavailable.data ?? []).filter((period) => selectedKey >= period.startDate && selectedKey <= period.endDate);

  const isScheduleLoading = availability.isLoading || unavailable.isLoading;
  const hasScheduleError = availability.isError || unavailable.isError;
  const retrySchedule = () => {
    if (availability.isError) void availability.refetch();
    if (unavailable.isError) void unavailable.refetch();
  };

  return (
    <section className="mb-7 overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm" aria-labelledby="sessions-calendar-heading" data-testid="section-tutor-calendar">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/8 text-primary">
              <CalendarIcon size={16} />
            </span>
            <h2 id="sessions-calendar-heading" className="text-base font-bold text-foreground">Session calendar</h2>
          </div>
          <p className="mt-1 pl-10 text-xs text-muted-foreground">Your lessons, weekly windows and time away · Melbourne time</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const today = currentMelbourneDate();
            setSelectedDate(today);
            setMonth(today);
          }}
          className="self-start rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:self-auto"
          data-testid="button-calendar-today"
        >
          Today
        </button>
      </div>

      {tutorId && <CalendarSubscriptionControl tutorId={tutorId} />}

      {hasScheduleError && (
        <div role="alert" className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 sm:mx-5">
          <p className="text-xs text-destructive">Some availability details could not be loaded. Booked lessons remain available below.</p>
          <button type="button" onClick={retrySchedule} className="inline-flex items-center gap-1 text-xs font-semibold text-destructive underline underline-offset-2" data-testid="button-calendar-retry">
            <RotateCw size={12} /> Try again
          </button>
        </div>
      )}

      <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,.85fr)]">
        <div className="min-w-0 p-3 sm:p-5">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            month={month}
            onMonthChange={setMonth}
            weekStartsOn={1}
            modifiers={{
              booked: bookedDates,
              pending: pendingDates,
              available: availableDates,
              unavailable: unavailableDates,
            }}
            modifiersClassNames={{
              booked: "bg-primary/10 font-semibold text-primary",
              pending: "bg-amber-100/70 font-semibold text-amber-900",
              available: "ring-1 ring-inset ring-accent/40",
              unavailable: "bg-destructive/10 text-destructive",
            }}
            components={{
              DayButton: (props) => <DayButton {...props} data-testid={dayButtonTestId(props)} />,
            }}
            className="mx-auto w-full max-w-[390px] rounded-xl bg-transparent p-1 [--cell-size:clamp(2.35rem,8vw,3rem)]"
            data-testid="calendar-tutor-sessions"
            aria-label="Tutor sessions calendar"
          />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-border px-2 pt-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5" data-testid="legend-calendar-booked"><i className="h-2.5 w-2.5 rounded-sm bg-primary" /> Booked lesson</span>
            <span className="inline-flex items-center gap-1.5" data-testid="legend-calendar-pending"><i className="h-2.5 w-2.5 rounded-sm bg-amber-300" /> Pending request</span>
            <span className="inline-flex items-center gap-1.5" data-testid="legend-calendar-available"><i className="h-2.5 w-2.5 rounded-sm border border-accent/60 bg-accent/15" /> Available window</span>
            <span className="inline-flex items-center gap-1.5" data-testid="legend-calendar-unavailable"><i className="h-2.5 w-2.5 rounded-sm bg-destructive/20" /> Unavailable</span>
          </div>
        </div>

        <aside className="min-w-0 border-t border-border bg-muted/25 p-4 sm:p-5 lg:border-l lg:border-t-0" aria-label="Selected date schedule">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">Selected day</p>
              <h3 className="mt-1 font-display text-xl font-semibold text-foreground" data-testid="text-calendar-selected-date">{format(selectedDate, "EEEE d MMMM")}</h3>
            </div>
            <span className="mt-1 rounded-lg bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {new Intl.DateTimeFormat("en-AU", { timeZone: BOOKING_TIME_ZONE, timeZoneName: "short" }).formatToParts(new Date()).find((part) => part.type === "timeZoneName")?.value}
            </span>
          </div>

          {sessionsLoading ? (
            <div className="space-y-2" role="status" aria-label="Loading booked lessons">
              <div className="h-[76px] animate-pulse rounded-xl bg-muted" />
              <div className="h-[76px] animate-pulse rounded-xl bg-muted" />
            </div>
          ) : sessionsError ? (
            <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3" data-testid="error-calendar-sessions">
              <p className="text-xs text-destructive">Booked lessons could not be loaded.</p>
              <button type="button" onClick={onRetrySessions} className="mt-1.5 text-xs font-semibold text-destructive underline underline-offset-2" data-testid="button-calendar-retry-sessions">Try again</button>
            </div>
          ) : selectedSessions.length > 0 ? (
            <div className="space-y-2">
              {selectedSessions.map((session) => (
                <article key={session.id} className="rounded-xl border border-primary/15 bg-card p-3" data-testid={`card-calendar-session-${session.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{session.subject}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{session.studentName ?? "Student"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sessionStatus(session).className}`}>
                      {sessionStatus(session).label}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock3 size={12} />{formatSessionTime(session.scheduledAt)} · {session.durationMinutes} min</span>
                    {session.lessonMode && <span className="inline-flex items-center gap-1">{session.lessonMode === "online" ? <Video size={12} /> : <MapPin size={12} />}{session.lessonMode === "online" ? "Online" : "In person"}</span>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/60 px-3 py-3 text-xs text-muted-foreground" data-testid="empty-calendar-bookings">
              No lessons or pending requests on this day.
            </div>
          )}

          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">Weekly availability</p>
            {isScheduleLoading ? (
              <div className="h-12 animate-pulse rounded-xl bg-muted" role="status" aria-label="Loading weekly availability" />
            ) : availability.isError ? (
              <p className="text-xs text-muted-foreground">Availability windows are unavailable right now.</p>
            ) : selectedWindows.length ? (
              <div className="space-y-1.5">
                {selectedWindows.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-xs" data-testid={`row-calendar-window-${slot.id}`}>
                    <span className="font-medium text-foreground">{formatWindowTime(slot.startTime)}–{formatWindowTime(slot.endTime)}</span>
                     <span className={`text-[10px] ${selectedPeriods.length ? "text-destructive" : "text-accent"}`}>
                       {selectedPeriods.length ? "Unavailable today" : "Available"}
                     </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-background/70 px-3 py-2.5 text-xs text-muted-foreground" data-testid="empty-calendar-windows">No recurring windows for this weekday.</p>
            )}
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">Unavailable dates</p>
            {isScheduleLoading ? (
              <div className="h-11 animate-pulse rounded-xl bg-muted" role="status" aria-label="Loading unavailable dates" />
            ) : unavailable.isError ? (
              <p className="text-xs text-muted-foreground">Unavailable periods are unavailable right now.</p>
            ) : selectedPeriods.length ? (
              <div className="space-y-2">
                {selectedPeriods.map((period) => (
                  <div key={period.id} className="flex gap-2 rounded-xl border border-destructive/15 bg-destructive/5 p-3" data-testid={`row-calendar-unavailable-${period.id}`}>
                    <ShieldAlert size={14} className="mt-0.5 shrink-0 text-destructive" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-destructive">Unavailable</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                        {period.startDate === period.endDate ? format(selectedDate, "d MMM yyyy") : `${period.startDate} – ${period.endDate}`}
                        {period.note ? ` · ${period.note}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-background/70 px-3 py-2.5 text-xs text-muted-foreground" data-testid="empty-calendar-unavailable">No unavailable period on this day.</p>
            )}
          </div>
        </aside>
      </div>

      {!isScheduleLoading && !hasScheduleError && (availability.data?.length ?? 0) === 0 && (unavailable.data?.length ?? 0) === 0 && (
        <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5" data-testid="empty-calendar-schedule">
          <ChevronRight size={14} className="text-accent" />
          No weekly windows or blocked dates yet. Your booked lessons will still appear here.
        </div>
      )}
    </section>
  );
}
