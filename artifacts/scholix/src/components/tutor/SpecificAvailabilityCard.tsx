import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetTutorAvailabilityOverridesQueryKey,
  useDeleteTutorAvailabilityOverride,
  useGetTutorAvailabilityOverrides,
  useUpsertTutorAvailabilityOverride,
} from "@workspace/api-client-react";
import { AlertCircle, CalendarClock, Check, Trash2 } from "lucide-react";
import { apiErrorMessage } from "@/lib/bookingRequests";

function todayInMelbourne() {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function displayDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-AU", {
    timeZone: "Australia/Melbourne",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function displayTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SpecificAvailabilityCard({ tutorId }: { tutorId: number }) {
  const queryClient = useQueryClient();
  const queryKey = getGetTutorAvailabilityOverridesQueryKey(tutorId);
  const overrides = useGetTutorAvailabilityOverrides(tutorId, {
    query: { queryKey, enabled: tutorId > 0, refetchOnMount: "always" },
  });
  const upsert = useUpsertTutorAvailabilityOverride();
  const remove = useDeleteTutorAvailabilityOverride();
  const [date, setDate] = useState(todayInMelbourne);
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("20:00");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = overrides.data?.find((override) => override.date === date);
    if (existing) {
      setStartTime(existing.startTime);
      setEndTime(existing.endTime);
    }
  }, [date, overrides.data]);

  const save = () => {
    setError("");
    setSaved(false);
    if (!date || startTime >= endTime) {
      setError("Choose a date and an end time after the start time.");
      return;
    }
    upsert.mutate({ tutorId, date, data: { startTime, endTime } }, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey });
        await queryClient.invalidateQueries({ queryKey: ["getTutorAvailableSlots"] });
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      },
      onError: (cause) => setError(apiErrorMessage(cause, "Could not save this date's availability.")),
    });
  };

  const deleteDate = (overrideDate: string) => {
    setError("");
    remove.mutate({ tutorId, date: overrideDate }, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey });
        await queryClient.invalidateQueries({ queryKey: ["getTutorAvailableSlots"] });
      },
      onError: (cause) => setError(apiErrorMessage(cause, "Could not restore the weekly schedule for this date.")),
    });
  };

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-card-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">One-off availability</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Change your hours for a single date without changing your weekly schedule. The times below replace that date’s usual hours only. Existing sessions stay booked.
        </p>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="text-[11px] font-medium text-foreground">
            Date
            <input
              type="date"
              value={date}
              min={todayInMelbourne()}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs"
            />
          </label>
          <label className="text-[11px] font-medium text-foreground">
            Available from
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs"
            />
          </label>
          <label className="text-[11px] font-medium text-foreground">
            Available until
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs"
            />
          </label>
          <button
            type="button"
            onClick={save}
            disabled={upsert.isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Check size={13} /> {upsert.isPending ? "Saving…" : "Save date"}
          </button>
        </div>

        {error && <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive"><AlertCircle size={13} className="mt-0.5 shrink-0" />{error}</p>}
        {saved && <p role="status" className="text-xs font-medium text-accent">Date-specific hours saved.</p>}

        {overrides.isLoading ? (
          <p role="status" className="text-xs text-muted-foreground">Loading one-off hours…</p>
        ) : overrides.isError ? (
          <p role="alert" className="text-xs text-destructive">Could not load one-off hours. Refresh and try again.</p>
        ) : overrides.data?.length ? (
          <ul className="space-y-2">
            {overrides.data.map((override) => (
              <li key={override.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{displayDate(override.date)}</p>
                  <p className="text-[11px] text-muted-foreground">{displayTime(override.startTime)} to {displayTime(override.endTime)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteDate(override.date)}
                  disabled={remove.isPending}
                  aria-label={`Remove one-off hours for ${override.date} and restore the weekly schedule`}
                  className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No one-off hours saved. Your weekly schedule applies to every date.</p>
        )}
      </div>
    </section>
  );
}
