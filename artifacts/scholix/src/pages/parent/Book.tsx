import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetTutor, useGetTutorAvailability, useListStudents, useCreateSession, useSimulatePayment,
  useGetTutorRelationshipForParent, useGetTutorAvailableSlots, getGetTutorAvailableSlotsQueryKey, useCancelSession, getSession,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateBookingQueries, apiErrorMessage, apiErrorStatus, formatInZone, lessonModeLabel } from "@/lib/bookingRequests";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft, Hourglass, CreditCard, Monitor, MapPin, RefreshCw, Baby, Plus, Calendar, Clock,
  Bell, ChevronRight, ShieldCheck, ChevronLeft, Info,
  AlertTriangle,
} from "lucide-react";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  isBefore, startOfToday, parseISO,
} from "date-fns";
import { VICTORIAN_SUBJECTS } from "@/lib/subjects";
import StatusBadge from "@/components/StatusBadge";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2.5 gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}

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
  const qc = useQueryClient();
  const { user } = useAuth();

  const tutor = useGetTutor(tutorId);
  const tutorAvailability = useGetTutorAvailability(tutorId);
  const allStudents = useListStudents();
  const createSession = useCreateSession();
  const simulatePayment = useSimulatePayment();
  const cancelSession = useCancelSession();

  const relationshipQuery = useGetTutorRelationshipForParent(
    tutorId,
    user?.id ?? 0,
    { query: { enabled: !!tutorId && !!user?.id, retry: false } as any }
  );

  const myStudents = allStudents.data?.filter((s) => s.parentId === user?.id) ?? [];

  const [step, setStep] = useState<BookStep>("details");
  const [chosenStudentId, setSelectedStudentId] = useState<number>(0);
  // Students load asynchronously. Derive the displayed auto-selection from the
  // current list, rather than freezing its initial empty state in useState.
  const selectedStudentId = myStudents.some((s) => s.id === chosenStudentId) ? chosenStudentId
    : myStudents.length === 1 ? myStudents[0].id : 0;
  const [subject, setSubject] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>("");   // "YYYY-MM-DD"
  const [selectedTime, setSelectedTime] = useState<string>("");   // "HH:MM"
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [createdSession, setCreatedSession] = useState<{
    id: number; subject: string; scheduledAt: string; durationMinutes: number; totalAmount: number;
    lessonMode?: string | null; requestExpiresAt?: string | null;
  } | null>(null);
  const [chosenMode, setChosenMode] = useState<"online" | "in_person" | "">("");
  const [conflictNotice, setConflictNotice] = useState("");
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

  // Lesson mode: relationship override wins, otherwise tutor default; "both" requires an explicit choice
  const relMode = relationshipQuery.data?.lessonMode;
  const tutorMode = tutor.data?.teachingMode;
  const fixedMode: "online" | "in_person" | null =
    relMode === "online" || relMode === "in_person" ? relMode
    : tutorMode === "online" || tutorMode === "in_person" ? tutorMode
    : null;
  const lessonMode: "online" | "in_person" | "" = fixedMode ?? chosenMode;

  const slotParams = { date: selectedDate, duration: selectedDuration, ...(lessonMode ? { lessonMode } : {}) };
  const slotsEnabled = !!tutorId && !!selectedDate && selectedDuration > 0 && !!lessonMode;
  const slotsQuery = useGetTutorAvailableSlots(tutorId, slotParams, {
    query: {
      enabled: slotsEnabled,
      queryKey: getGetTutorAvailableSlotsQueryKey(tutorId, slotParams),
      staleTime: 15000,
      retry: 1,
    },
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
    if (!lessonMode) { setError("Please choose online or in-person"); return; }
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

    const scheduledAt = slotsQuery.data?.slotInstants?.[selectedTime];
    if (!scheduledAt || !lessonMode) {
      setError("That time is no longer available. Please choose another.");
      setSelectedTime("");
      slotsQuery.refetch();
      return;
    }

    createSession.mutate(
      {
        data: {
          tutorId,
          studentId: selectedStudentId,
          subject,
          scheduledAt,
          durationMinutes: selectedDuration,
          lessonMode,
        },
      },
      {
        onSuccess: (session) => {
          setCreatedSession(session);
          setConflictNotice("");
          setStep("payment");
          invalidateBookingQueries(qc);
        },
        onError: (err: unknown) => {
          const status = apiErrorStatus(err);
          if (status === 409 || status === 422) {
            setConflictNotice(apiErrorMessage(err, "That time was just taken. Times below have been refreshed."));
            setSelectedTime("");
            slotsQuery.refetch();
            return;
          }
          setError(apiErrorMessage(err, "Could not create the request. Please try again."));
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
          setError("");
          const sessionId = createdSession.id;
          // The hold is authorised. Drop the stale 15-minute checkout deadline, then load the new request deadline.
          setCreatedSession((prev) => (prev ? { ...prev, requestExpiresAt: null } : prev));
          setStep("confirmed");
          invalidateBookingQueries(qc);
          getSession(sessionId)
            .then((fresh) => setCreatedSession((prev) => (prev && prev.id === fresh.id ? { ...prev, ...fresh } : prev)))
            .catch(() => { /* Hold already authorised; dashboard shows the live deadline. */ });
        },
        onError: (err) => setError(apiErrorMessage(err, "We could not place the beta hold. Please try again.")),
      }
    );
  };

  const handleAbandonCheckout = () => {
    if (!createdSession) { setStep("time"); return; }
    cancelSession.mutate({ sessionId: createdSession.id }, {
      onSuccess: () => {
        setCreatedSession(null);
        setSelectedTime("");
        setError("");
        setStep("time");
        invalidateBookingQueries(qc);
        slotsQuery.refetch();
      },
      onError: (err) => setError(apiErrorMessage(err, "Could not cancel this checkout. Try again from your dashboard.")),
    });
  };

  // ── Loading / not found ───────────────────────────────────────────────────

  if (tutor.isLoading) {
    return <div className="p-6"><div className="h-8 bg-muted rounded animate-pulse" /></div>;
  }
  if (!tutor.data) {
    return <div className="p-6 text-sm text-muted-foreground">Tutor not found.</div>;
  }

  // ── Tutor header card (shared) ────────────────────────────────────────────

  const relationshipLessonMode = relMode ?? null;
  const effectiveMode = relationshipLessonMode ?? tutor.data.teachingMode;
  const tz = slotsQuery.data?.timezone;
  const isFamilyOverride = !!relationshipLessonMode;

  const modeLabel = effectiveMode === "in_person" ? "In-person" : effectiveMode === "both" ? "Online & in-person" : "Online";

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
            {tutor.data!.verificationStatus === "verified" && (
              <ShieldCheck size={13} className="text-accent shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-muted-foreground">${tutor.data!.hourlyRate}/hr</p>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
              {modeLabel}
            </span>
            {isFamilyOverride && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                For your family
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Confirmed ─────────────────────────────────────────────────────────────

  if (step === "confirmed" && createdSession) {
    const expiresLabel = createdSession.requestExpiresAt ? formatInZone(createdSession.requestExpiresAt, tz) : null;
    return (
      <div className="p-4 md:p-6 max-w-sm mx-auto pt-10 animate-in fade-in slide-in-from-bottom-2 duration-500" data-testid="screen-request-sent">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4 animate-in zoom-in-75 duration-500">
            <Hourglass size={28} className="text-amber-700" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Request sent</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Awaiting confirmation from {tutor.data!.firstName}. This lesson is not booked until they accept.</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Request details</p>
            <StatusBadge status="pending_confirmation" />
          </div>
          <div className="px-4 py-3 divide-y divide-border">
            <Row label="Tutor" value={`${tutor.data!.firstName} ${tutor.data!.lastName}`} />
            {selectedStudent && <Row label="Student" value={`${selectedStudent.firstName}${selectedStudent.lastName ? ` ${selectedStudent.lastName}` : ""}`} />}
            <Row label="Subject" value={createdSession.subject} />
            <Row label="Lesson" value={lessonModeLabel(createdSession.lessonMode ?? lessonMode)} />
            <div className="flex justify-between py-2.5 gap-3">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Calendar size={13} /> Requested time</span>
              <span className="text-sm font-semibold text-foreground text-right" data-testid="text-request-time">
                {formatInZone(createdSession.scheduledAt, tz)}
                {tz && <span className="block text-[11px] font-normal text-muted-foreground">{tz}</span>}
              </span>
            </div>
            <Row label="Duration" value={`${createdSession.durationMinutes} min`} />
            <Row label="Beta hold" value={`$${createdSession.totalAmount.toFixed(2)}`} />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 space-y-1.5">
          <p className="text-xs font-semibold text-amber-800">What happens next</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            {expiresLabel
              ? <>{tutor.data!.firstName} has until <strong>{expiresLabel}</strong> to respond.</>
              : <>{tutor.data!.firstName} has 24 hours, or until the lesson starts if sooner, to respond. Your dashboard shows the exact deadline.</>}
            {" "}If they accept, the simulated hold is captured and the lesson is scheduled. If they decline or the request expires, the hold is released.
          </p>
          <p className="text-[11px] text-amber-700">Beta: no real card was charged. You can withdraw this request from your dashboard at any time before it is accepted.</p>
        </div>

        <div className="space-y-2">
          <Link href="/parent/dashboard" className="flex items-center justify-between w-full py-3 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity" data-testid="link-dashboard">
            Track request on dashboard <ChevronRight size={16} />
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
          <button onClick={handleAbandonCheckout} disabled={cancelSession.isPending} aria-label="Cancel checkout and choose another time" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-foreground">Place a beta hold</h1>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-amber-800">Simulated hold, no real card charged</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              This authorises a beta hold and sends your request to {tutor.data!.firstName}. It is captured only if they accept, and released if they decline or don't respond within 24 hours (or before the lesson starts, if sooner). Unfinished checkouts expire after 15 minutes.
            </p>
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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lesson</span>
              <span className="font-medium">{lessonModeLabel(createdSession.lessonMode ?? lessonMode)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium text-right">{formatInZone(createdSession.scheduledAt, tz)}{tz ? ` (${tz})` : ""}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold">Hold amount</span>
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
          {simulatePayment.isPending ? "Placing hold..." : `Place hold and send request: $${createdSession.totalAmount.toFixed(2)}`}
        </button>
        <button
          onClick={handleAbandonCheckout}
          disabled={cancelSession.isPending || simulatePayment.isPending}
          className="w-full mt-2 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
          data-testid="button-cancel-checkout"
        >
          {cancelSession.isPending ? "Cancelling..." : "Cancel and choose another time"}
        </button>
      </div>
    );
  }

  // ── Step: time slot selection ─────────────────────────────────────────────

  if (step === "time") {
    const preferred = slotsQuery.data?.preferredSlots ?? [];
    const allSlots = slotsQuery.data?.slots ?? [];
    const preferredSet = new Set(preferred);
    const otherSlots = allSlots.filter((t) => !preferredSet.has(t));
    const slots = allSlots;
    const slotBtn = (time: string) => (
      <button
        key={time}
        onClick={() => { setSelectedTime(time); setError(""); }}
        data-testid={`button-slot-${time}`}
        className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
          selectedTime === time
            ? "border-primary bg-primary text-white scale-[1.03]"
            : "border-border bg-card text-foreground hover:border-primary/40"
        }`}
      >
        {fmtTime(time)}
      </button>
    );
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
            <p className="text-xs text-muted-foreground">{dateLabel} · {selectedDuration} min · {lessonModeLabel(lessonMode)}</p>
          </div>
        </div>

        <TutorCard />

        {tz && (
          <p className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1.5" data-testid="text-timezone">
            <Clock size={11} /> Times shown in {tz} (tutor's time zone)
          </p>
        )}
        {conflictNotice && (
          <div role="status" className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 animate-in fade-in duration-300">
            <RefreshCw size={13} className="shrink-0 mt-0.5" /> {conflictNotice}
          </div>
        )}
        {slotsQuery.isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : slotsQuery.isError ? (
          <div className="p-6 rounded-2xl border border-destructive/30 bg-destructive/5 text-center" role="alert">
            <AlertTriangle size={20} className="text-destructive mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">We couldn't load times</p>
            <p className="text-xs text-muted-foreground mt-0.5">{apiErrorMessage(slotsQuery.error, "Something went wrong reaching the server.")}</p>
            <button onClick={() => slotsQuery.refetch()} className="mt-3 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors" data-testid="button-retry-slots">
              Try again
            </button>
          </div>
        ) : slots.length === 0 ? (
          <div className="p-6 rounded-2xl border-2 border-dashed border-border bg-muted/20 text-center">
            <Clock size={20} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No times available</p>
            <p className="text-xs text-muted-foreground mt-0.5">All slots on this date are taken. Try another date.</p>
            <button onClick={() => setStep("date")} className="mt-3 text-xs text-primary font-semibold hover:underline">
              Choose another date
            </button>
          </div>
        ) : (
          <>
            {preferred.length > 0 && (
              <>
                <p className="text-xs font-semibold text-foreground mb-2">Suggested starts</p>
                <div className="grid grid-cols-3 gap-2 mb-4">{preferred.map(slotBtn)}</div>
              </>
            )}
            {otherSlots.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{preferred.length > 0 ? "Other flexible starts" : "Available starts"}</p>
                <div className="grid grid-cols-3 gap-2 mb-5">{otherSlots.map(slotBtn)}</div>
              </>
            )}

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
                  <span className="font-semibold">Beta hold if sent</span>
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
                ? "Reserving..."
                : selectedTime
                  ? `Continue to request: $${totalAmount.toFixed(2)}`
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

      {/* Lesson mode preference notice */}
      {isFamilyOverride && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-primary/5 border border-primary/20 mb-4">
          <Info size={14} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">
              {tutor.data!.firstName} has set this family's sessions to {modeLabel.toLowerCase()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              This preference was chosen by your tutor and can't be changed here.
            </p>
          </div>
        </div>
      )}

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

      {/* Lesson mode */}
      {!fixedMode && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">Lesson type</label>
          <div className="grid grid-cols-2 gap-2">
            {([["online", "Online", Monitor], ["in_person", "In-person", MapPin]] as const).map(([val, label, Icon]) => (
              <button
                key={val}
                type="button"
                onClick={() => { setChosenMode(val); setSelectedTime(""); }}
                aria-pressed={chosenMode === val}
                data-testid={`button-mode-${val}`}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all duration-200 ${
                  chosenMode === val ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
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
