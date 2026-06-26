import { useState, useMemo } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useGetTutor, useGetTutorAvailability, useListStudents, useCreateSession, useSimulatePayment } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getListSessionsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft, CheckCircle, CreditCard, Baby, Plus, Calendar, Clock,
  Bell, ChevronRight, ShieldCheck, ChevronLeft,
} from "lucide-react";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  isBefore, startOfToday, parseISO,
} from "date-fns";
import { VICTORIAN_SUBJECTS } from "@/lib/subjects";

type BookStep = "details" | "duration" | "date" | "time" | "payment" | "confirmed";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// JS getDay(): 0=Sun,1=Mon,…,6=Sat → our dayOfWeek: Mon=0,…,Sun=6
function jsDayToDow(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function BookSession() {
  const [, params] = useRoute("/parent/book/:tutorId");
  const tutorId = Number(params?.tutorId);
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { user } = useAuth();

  const tutor = useGetTutor(tutorId);
  const tutorAvailability = useGetTutorAvailability(tutorId);
  const allStudents = useListStudents();
  const createSession = useCreateSession();
  const simulatePayment = useSimulatePayment();

  const myStudents = allStudents.data?.filter((s) => s.parentId === user?.id) ?? [];

  const [step, setStep] = useState<BookStep>("details");
  const [selectedStudentId, setSelectedStudentId] = useState<number>(myStudents.length === 1 ? myStudents[0].id : 0);
  const [subject, setSubject] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>("");   // "YYYY-MM-DD"
  const [selectedTime, setSelectedTime] = useState<string>("");   // "HH:MM"
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [createdSession, setCreatedSession] = useState<{
    id: number; subject: string; scheduledAt: string; durationMinutes: number; totalAmount: number;
  } | null>(null);
  const [error, setError] = useState("");

  // Compute available day-of-week numbers from tutor's availability windows
  const availableDows = useMemo(() => {
    const windows = tutorAvailability.data ?? [];
    return new Set(windows.map((w) => w.dayOfWeek));
  }, [tutorAvailability.data]);

  // Allowed session durations: from tutor profile, or default [60, 90]
  const allowedDurations = useMemo(() => {
    const d = tutor.data?.sessionDurations;
    return d && d.length > 0 ? d : [60, 90];
  }, [tutor.data?.sessionDurations]);

  // Fetch available time slots for selected date + duration
  const slotsQuery = useQuery({
    queryKey: ["available-slots", tutorId, selectedDate, selectedDuration],
    queryFn: async (): Promise<{ date: string; duration: number; slots: string[] }> => {
      const parentParam = user?.id ? `&parentId=${user.id}` : "";
      const r = await fetch(
        `/api/tutors/${tutorId}/available-slots?date=${selectedDate}&duration=${selectedDuration}${parentParam}`
      );
      if (!r.ok) return { date: selectedDate, duration: selectedDuration, slots: [] };
      return r.json();
    },
    enabled: !!selectedDate && selectedDuration > 0,
    staleTime: 30000,
  });

  // Calendar grid for current calendarMonth
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const today = startOfToday();

  function isDateAvailable(date: Date): boolean {
    if (isBefore(date, today)) return false;
    const dow = jsDayToDow(date.getDay());
    return availableDows.has(dow);
  }

  const tutorSubjects = tutor.data?.subjects ?? [];
  const otherSubjects = VICTORIAN_SUBJECTS.filter((s) => !tutorSubjects.includes(s));
  const selectedStudent = myStudents.find((s) => s.id === selectedStudentId);

  const totalAmount = tutor.data
    ? (tutor.data.hourlyRate * (selectedDuration || 60)) / 60
    : 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleContinueDetails = () => {
    setError("");
    if (!selectedStudentId) { setError("Please select a student"); return; }
    if (!subject) { setError("Please select a subject"); return; }
    setStep("duration");
  };

  const handleSelectDuration = (d: number) => {
    setSelectedDuration(d);
    setSelectedDate("");
    setSelectedTime("");
    setStep("date");
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(format(date, "yyyy-MM-dd"));
    setSelectedTime("");
    setStep("time");
  };

  const handleBookSession = () => {
    setError("");
    if (!selectedTime) { setError("Please select a time"); return; }

    const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();

    createSession.mutate(
      {
        data: {
          tutorId,
          studentId: selectedStudentId,
          subject,
          scheduledAt,
          durationMinutes: selectedDuration,
        },
      },
      {
        onSuccess: (session) => {
          setCreatedSession(session as typeof createdSession);
          setStep("payment");
          qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          setError(msg ?? "Could not create session. The slot may have just been taken.");
        },
      }
    );
  };

  const handlePayment = () => {
    if (!createdSession) return;
    simulatePayment.mutate(
      { data: { sessionId: createdSession.id } },
      {
        onSuccess: () => {
          setStep("confirmed");
          qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        },
        onError: () => setError("Payment failed. Please try again."),
      }
    );
  };

  // ── Loading / not found ───────────────────────────────────────────────────

  if (tutor.isLoading) {
    return <div className="p-6"><div className="h-8 bg-muted rounded animate-pulse" /></div>;
  }
  if (!tutor.data) {
    return <div className="p-6 text-sm text-muted-foreground">Tutor not found.</div>;
  }

  // ── Tutor header card (shared) ────────────────────────────────────────────

  const tutorMode = tutor.data.teachingMode;
  const modeLabel = tutorMode === "in_person" ? "In-person" : tutorMode === "both" ? "Online & in-person" : "Online";
  const modeIcon = tutorMode === "online" || !tutorMode ? "🖥️" : tutorMode === "both" ? "🌐" : "📍";

  const TutorCard = () => (
    <div className="bg-card border border-card-border rounded-xl p-4 mb-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">
            {tutor.data!.firstName[0]}{tutor.data!.lastName[0]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-foreground">{tutor.data!.firstName} {tutor.data!.lastName}</p>
            {tutor.data!.verificationStatus === "approved" && (
              <ShieldCheck size={13} className="text-accent shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-muted-foreground">${tutor.data!.hourlyRate}/hr</p>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
              {modeIcon} {modeLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Confirmed ─────────────────────────────────────────────────────────────

  if (step === "confirmed" && createdSession) {
    const scheduledDate = new Date(createdSession.scheduledAt);
    return (
      <div className="p-4 md:p-6 max-w-sm mx-auto pt-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Session Booked!</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Payment processed. Your session is confirmed.</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session Details</p>
          </div>
          <div className="px-4 py-3 divide-y divide-border">
            <div className="flex justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Tutor</span>
              <span className="text-sm font-semibold text-foreground">{tutor.data!.firstName} {tutor.data!.lastName}</span>
            </div>
            {selectedStudent && (
              <div className="flex justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Student</span>
                <span className="text-sm font-semibold text-foreground">{selectedStudent.firstName}{(selectedStudent as any).lastName ? ` ${(selectedStudent as any).lastName}` : ""}</span>
              </div>
            )}
            <div className="flex justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Subject</span>
              <span className="text-sm font-semibold text-foreground">{createdSession.subject}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Calendar size={13} /> Date & time</span>
              <span className="text-sm font-semibold text-foreground text-right">
                {format(scheduledDate, "EEE, MMM d")}<br />
                <span className="font-normal text-muted-foreground">{format(scheduledDate, "h:mm a")}</span>
              </span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Clock size={13} /> Duration</span>
              <span className="text-sm font-semibold text-foreground">{createdSession.durationMinutes} min</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Amount paid</span>
              <span className="text-sm font-bold text-accent">${createdSession.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <p className="text-xs font-semibold text-amber-800 mb-1">💳 Pay your tutor directly</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Scholix is in beta — payments are simulated. Please pay <strong>{tutor.data!.firstName} {tutor.data!.lastName}</strong> via PayID, bank transfer, or cash.
          </p>
        </div>

        <div className="space-y-2">
          <Link href="/parent/dashboard" className="flex items-center justify-between w-full py-3 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            Go to Dashboard <ChevronRight size={16} />
          </Link>
          <Link href="/settings" className="flex items-center justify-between w-full py-3 px-4 rounded-xl bg-card border border-card-border text-sm font-medium text-foreground hover:border-primary/40 transition-colors">
            <span className="flex items-center gap-2"><Bell size={14} className="text-muted-foreground" /> Manage Notifications</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        </div>
      </div>
    );
  }

  // ── Payment ───────────────────────────────────────────────────────────────

  if (step === "payment" && createdSession) {
    return (
      <div className="p-4 md:p-6 max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep("time")} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-foreground">Pay before session</h1>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4 flex items-start gap-2.5">
          <span className="text-amber-500 text-base shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="text-xs font-semibold text-amber-800">This is a simulated payment</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">Scholix is in beta — no real charges are made.</p>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">Order summary</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tutor</span>
              <span className="font-medium">{tutor.data!.firstName} {tutor.data!.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subject</span>
              <span className="font-medium">{createdSession.subject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{createdSession.durationMinutes} min</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-base">${createdSession.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-primary" />
            <span className="text-sm font-semibold">Demo Payment</span>
          </div>
          <div className="space-y-2">
            <input disabled value="4242 4242 4242 4242" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-muted-foreground" readOnly />
            <div className="grid grid-cols-2 gap-2">
              <input disabled value="12/28" className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-muted-foreground" readOnly />
              <input disabled value="123" className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-muted-foreground" readOnly />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive mb-3">{error}</p>}

        <button
          onClick={handlePayment}
          disabled={simulatePayment.isPending}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {simulatePayment.isPending ? "Processing..." : `Pay $${createdSession.totalAmount.toFixed(2)}`}
        </button>
      </div>
    );
  }

  // ── Step: time slot selection ─────────────────────────────────────────────

  if (step === "time") {
    const slots = slotsQuery.data?.slots ?? [];
    const dateLabel = selectedDate
      ? format(parseISO(selectedDate), "EEEE, d MMMM")
      : "";

    return (
      <div className="p-4 md:p-6 max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => { setStep("date"); setSelectedTime(""); }} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Choose a time</h1>
            <p className="text-xs text-muted-foreground">{dateLabel} · {selectedDuration} min session</p>
          </div>
        </div>

        <TutorCard />

        {slotsQuery.isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : slots.length === 0 ? (
          <div className="p-6 rounded-2xl border-2 border-dashed border-border bg-muted/20 text-center">
            <Clock size={20} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No times available</p>
            <p className="text-xs text-muted-foreground mt-0.5">All slots on this date are taken. Try another date.</p>
            <button onClick={() => setStep("date")} className="mt-3 text-xs text-primary font-semibold hover:underline">
              ← Choose another date
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {slots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    selectedTime === time
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card text-foreground hover:border-primary/40"
                  }`}
                >
                  {fmtTime(time)}
                </button>
              ))}
            </div>

            {selectedTime && (
              <div className="bg-muted/50 rounded-xl p-3.5 mb-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{dateLabel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{fmtTime(selectedTime)} – {fmtTime(
                    (() => {
                      const [h, m] = selectedTime.split(":").map(Number);
                      const end = h * 60 + m + selectedDuration;
                      return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
                    })()
                  )}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{selectedDuration} min</span>
                </div>
                <div className="flex justify-between text-sm pt-1.5 border-t border-border">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-accent">${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive mb-3">{error}</p>}

            <button
              onClick={handleBookSession}
              disabled={createSession.isPending || !selectedTime}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {createSession.isPending
                ? "Booking…"
                : selectedTime
                  ? `Book session — $${totalAmount.toFixed(2)}`
                  : "Select a time above"}
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Step: calendar / date selection ──────────────────────────────────────

  if (step === "date") {
    const firstDay = startOfMonth(calendarMonth);
    // How many blank cells before the first day (Mon=0)
    const startDow = jsDayToDow(firstDay.getDay());
    const blanksBefore = Array(startDow).fill(null);

    const prevMonthDisabled = isBefore(endOfMonth(subMonths(calendarMonth, 1)), today);

    return (
      <div className="p-4 md:p-6 max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setStep("duration")} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Choose a date</h1>
            <p className="text-xs text-muted-foreground">{selectedDuration} min session · ${totalAmount.toFixed(2)}</p>
          </div>
        </div>

        <TutorCard />

        {/* Calendar */}
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <button
              onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
              disabled={prevMonthDisabled}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {format(calendarMonth, "MMMM yyyy")}
            </span>
            <button
              onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center py-2 text-[10px] font-semibold text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 p-2 gap-1">
            {blanksBefore.map((_, i) => <div key={`blank-${i}`} />)}
            {calendarDays.map((date) => {
              const available = isDateAvailable(date);
              const isSelected = selectedDate === format(date, "yyyy-MM-dd");
              const dateNum = format(date, "d");
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => available && handleSelectDate(date)}
                  disabled={!available}
                  className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? "bg-primary text-white ring-2 ring-primary ring-offset-1"
                      : available
                        ? "bg-primary/10 text-primary hover:bg-primary hover:text-white cursor-pointer"
                        : "text-muted-foreground/40 cursor-default"
                  }`}
                >
                  {dateNum}
                </button>
              );
            })}
          </div>

          <div className="px-4 pb-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-primary/20 inline-block" /> Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-muted inline-block" /> Unavailable
            </span>
          </div>
        </div>

        {availableDows.size === 0 && !tutorAvailability.isLoading && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            {tutor.data!.firstName} hasn't set any availability yet. Check back later.
          </p>
        )}
      </div>
    );
  }

  // ── Step: duration selection ──────────────────────────────────────────────

  if (step === "duration") {
    return (
      <div className="p-4 md:p-6 max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setStep("details")} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-foreground">Session length</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5 ml-11">How long do you need?</p>

        <TutorCard />

        <div className="space-y-3">
          {allowedDurations.map((d) => {
            const amount = (tutor.data!.hourlyRate * d) / 60;
            return (
              <button
                key={d}
                onClick={() => handleSelectDuration(d)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Clock size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{d} minutes</p>
                    <p className="text-xs text-muted-foreground">
                      {d < 60 ? `${d} min session` : `${d / 60 === 1 ? "1 hour" : `${d / 60} hours`}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-foreground">${amount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">total</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Step: details (student + subject) — default ───────────────────────────

  return (
    <div className="p-4 md:p-6 max-w-sm mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/parent/tutors" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Book a Session</h1>
      </div>

      <TutorCard />

      {/* Student selector */}
      {allStudents.isLoading ? (
        <div className="h-11 rounded-lg bg-muted animate-pulse mb-4" />
      ) : myStudents.length === 0 ? (
        <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-dashed border-border bg-muted/30 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Baby size={15} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">No students added yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add a student before booking</p>
            <Link href="/parent/students" className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
              <Plus size={12} /> Add a student
            </Link>
          </div>
        </div>
      ) : myStudents.length === 1 ? (
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">Student</label>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-input bg-muted/40">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-primary">
                {(myStudents[0] as any).lastName
                  ? `${myStudents[0].firstName[0]}${(myStudents[0] as any).lastName[0]}`
                  : myStudents[0].firstName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {myStudents[0].firstName}{(myStudents[0] as any).lastName ? ` ${(myStudents[0] as any).lastName}` : ""}
              </p>
              {(myStudents[0] as any).yearLevel && <p className="text-[11px] text-muted-foreground">{(myStudents[0] as any).yearLevel}</p>}
            </div>
            <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">Auto-selected</span>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">Student</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value={0}>Select a student...</option>
            {myStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName}{(s as any).lastName ? ` ${(s as any).lastName}` : ""}{(s as any).yearLevel ? ` · ${(s as any).yearLevel}` : ""}
              </option>
            ))}
          </select>
          <Link href="/parent/students" className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors">
            <Plus size={10} /> Add another student
          </Link>
        </div>
      )}

      {/* Subject */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-foreground mb-1.5">Subject</label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select a subject...</option>
          {tutorSubjects.length > 0 && (
            <optgroup label={`${tutor.data!.firstName}'s subjects`}>
              {tutorSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </optgroup>
          )}
          <optgroup label="Other subjects">
            {otherSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </optgroup>
        </select>
      </div>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}

      <button
        onClick={handleContinueDetails}
        disabled={myStudents.length === 0}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        Continue
      </button>
    </div>
  );
}
