import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetTutorUnavailablePeriodsQueryKey,
  useCreateTutorUnavailablePeriod,
  useDeleteTutorUnavailablePeriod,
  useGetTutorUnavailablePeriods,
} from "@workspace/api-client-react";
import { AlertCircle, CalendarOff, Check, Trash2 } from "lucide-react";
import { apiErrorMessage } from "@/lib/bookingRequests";

function todayLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function displayDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default function UnavailablePeriodsCard({ tutorId }: { tutorId: number }) {
  const queryClient = useQueryClient();
  const queryKey = getGetTutorUnavailablePeriodsQueryKey(tutorId);
  const periods = useGetTutorUnavailablePeriods(tutorId, {
    query: { queryKey, enabled: tutorId > 0, refetchOnMount: "always" },
  });
  const createPeriod = useCreateTutorUnavailablePeriod();
  const deletePeriod = useDeleteTutorUnavailablePeriod();
  const [startDate, setStartDate] = useState(todayLocal);
  const [endDate, setEndDate] = useState(todayLocal);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const addPeriod = () => {
    setError("");
    if (startDate > endDate) {
      setError("Choose an end date on or after the start date.");
      return;
    }
    createPeriod.mutate({ tutorId, data: { startDate, endDate, note: note.trim() || undefined } }, {
      onSuccess: async () => {
        setNote("");
        await queryClient.invalidateQueries({ queryKey });
      },
      onError: (cause) => setError(apiErrorMessage(cause, "Could not block those dates.")),
    });
  };

  const removePeriod = (periodId: number) => {
    setError("");
    deletePeriod.mutate({ tutorId, periodId }, {
      onSuccess: async () => queryClient.invalidateQueries({ queryKey }),
      onError: (cause) => setError(apiErrorMessage(cause, "Could not remove the blocked dates.")),
    });
  };

  return (
    <section className="bg-card border border-card-border rounded-2xl overflow-hidden mb-4">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <CalendarOff size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Unavailable dates</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Block school holidays or leave. These dates stop appearing as bookable. Existing sessions are not cancelled; reschedule them first.
        </p>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.3fr_auto] gap-2 items-end">
          <label className="text-[11px] font-medium text-foreground">
            From
            <input type="date" value={startDate} min={todayLocal()} onChange={(event) => setStartDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs" />
          </label>
          <label className="text-[11px] font-medium text-foreground">
            Through
            <input type="date" value={endDate} min={startDate || todayLocal()} onChange={(event) => setEndDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs" />
          </label>
          <label className="text-[11px] font-medium text-foreground">
            Label (optional)
            <input value={note} maxLength={160} onChange={(event) => setNote(event.target.value)} placeholder="School holidays" className="mt-1 block w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs" />
          </label>
          <button type="button" onClick={addPeriod} disabled={createPeriod.isPending} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
            <Check size={13} /> {createPeriod.isPending ? "Saving…" : "Block dates"}
          </button>
        </div>

        {error && <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive"><AlertCircle size={13} className="mt-0.5 shrink-0" />{error}</p>}
        {periods.isLoading ? (
          <p role="status" className="text-xs text-muted-foreground">Loading blocked dates…</p>
        ) : periods.isError ? (
          <p role="alert" className="text-xs text-destructive">Could not load blocked dates. Refresh and try again.</p>
        ) : periods.data?.length ? (
          <ul className="space-y-2">
            {periods.data.map((period) => (
              <li key={period.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">
                    {displayDate(period.startDate)}{period.startDate !== period.endDate && ` – ${displayDate(period.endDate)}`}
                  </p>
                  {period.note && <p className="text-[11px] text-muted-foreground truncate">{period.note}</p>}
                </div>
                <button type="button" onClick={() => removePeriod(period.id)} disabled={deletePeriod.isPending} aria-label={`Remove blocked dates from ${period.startDate} through ${period.endDate}`} className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No unavailable dates saved.</p>
        )}
      </div>
    </section>
  );
}
