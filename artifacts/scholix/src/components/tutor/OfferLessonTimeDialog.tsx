import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetTutorAvailableSlotsQueryKey,
  useCreateTutorLessonOffer,
  useGetTutorAvailableSlots,
  type TutorLessonOfferInputDurationMinutes,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiErrorMessage, invalidateBookingQueries } from "@/lib/bookingRequests";

type LessonMode = "online" | "in_person";

interface OfferLessonTimeDialogProps {
  open: boolean;
  onClose: () => void;
  tutorId: number;
  studentId: number;
  studentName: string;
  subjects: string[];
  durations: number[];
  teachingMode: string;
  preferredMode?: LessonMode | null;
}

function formatClock(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

export default function OfferLessonTimeDialog({
  open,
  onClose,
  tutorId,
  studentId,
  studentName,
  subjects,
  durations,
  teachingMode,
  preferredMode,
}: OfferLessonTimeDialogProps) {
  const queryClient = useQueryClient();
  const durationOptions = durations.length ? durations : [60];
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [duration, setDuration] = useState(durationOptions.includes(60) ? 60 : durationOptions[0]);
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const fixedMode: LessonMode = teachingMode === "in_person" ? "in_person" : "online";
  const [lessonMode, setLessonMode] = useState<LessonMode>(preferredMode ?? fixedMode);
  const [selectedTime, setSelectedTime] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const modeOptions: LessonMode[] = teachingMode === "both"
    ? ["online", "in_person"]
    : [fixedMode];
  const slotParams = { date, duration, lessonMode, studentId };
  const slots = useGetTutorAvailableSlots(tutorId, slotParams, {
    query: {
      enabled: open && !!date,
      queryKey: getGetTutorAvailableSlotsQueryKey(tutorId, slotParams),
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
  });
  const createOffer = useCreateTutorLessonOffer();
  const availableTimes = useMemo(
    () => Object.entries(slots.data?.slotInstants ?? {}).sort(([a], [b]) => a.localeCompare(b)),
    [slots.data?.slotInstants],
  );

  useEffect(() => {
    if (!availableTimes.some(([time]) => time === selectedTime)) {
      setSelectedTime(availableTimes[0]?.[0] ?? "");
    }
  }, [availableTimes, selectedTime]);

  useEffect(() => {
    if (open) setSent(false);
  }, [open]);

  const handleSend = () => {
    const scheduledAt = slots.data?.slotInstants?.[selectedTime];
    if (!scheduledAt || !subject.trim()) return;
    setError("");
    createOffer.mutate({
      tutorId,
      data: { studentId, subject: subject.trim(), scheduledAt, durationMinutes: duration as TutorLessonOfferInputDurationMinutes, lessonMode },
    }, {
      onSuccess: async () => {
        setSent(true);
        await invalidateBookingQueries(queryClient);
      },
      onError: (cause) => setError(apiErrorMessage(cause, "Could not send this offer. Refresh available times and try again.")),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Offer a lesson time</DialogTitle>
          <DialogDescription>
            Choose a real available time for {studentName}. They will receive an in-app offer and can accept it from their dashboard.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="rounded-xl border border-brand-teal/25 bg-brand-teal/5 p-4">
            <p className="text-sm font-semibold text-foreground">Offer sent</p>
            <p className="text-xs text-muted-foreground mt-1">
              The parent has 24 hours to accept. The lesson is confirmed only after they accept the simulated payment step. No real payment is taken.
            </p>
            <button type="button" onClick={onClose} className="mt-3 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-foreground">
                Date
                <input
                  type="date"
                  value={date}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-foreground">
                Length
                <select
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  {durationOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
                </select>
              </label>
            </div>

            {subjects.length > 0 ? (
              <label className="block text-xs font-medium text-foreground">
                Subject
                <select value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            ) : (
              <label className="block text-xs font-medium text-foreground">
                Subject
                <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </label>
            )}

            {modeOptions.length > 1 && (
              <label className="block text-xs font-medium text-foreground">
                Lesson type
                <select value={lessonMode} onChange={(event) => setLessonMode(event.target.value as LessonMode)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="online">Online</option>
                  <option value="in_person">In person</option>
                </select>
              </label>
            )}

            <div>
              <p className="text-xs font-medium text-foreground mb-2">Available start times</p>
              {slots.isLoading ? (
                <p role="status" className="text-xs text-muted-foreground">Checking your schedule…</p>
              ) : slots.isError ? (
                <p role="alert" className="text-xs text-destructive">Could not load available times. Try another date.</p>
              ) : availableTimes.length ? (
                <div className="flex flex-wrap gap-2">
                  {availableTimes.map(([time]) => (
                    <button
                      key={time}
                      type="button"
                      aria-pressed={selectedTime === time}
                      onClick={() => setSelectedTime(time)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selectedTime === time ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary"
                      }`}
                    >
                      {formatClock(time)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No available times on this date. Try another day or duration.</p>
              )}
            </div>

            <p className="rounded-lg bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
              The offer holds this time for up to 24 hours. The parent must accept it. Scholix beta payments are simulated and do not charge a card.
            </p>
            {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!selectedTime || !subject.trim() || slots.isLoading || createOffer.isPending}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {createOffer.isPending ? "Sending…" : "Send offer"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
