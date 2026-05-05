import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useGetTutor, useGetTutorAvailability, useListStudents, useCreateSession, useSimulatePayment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListSessionsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, CheckCircle, CreditCard, GraduationCap, Baby, Plus, Calendar, Clock, Bell, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "English Literature", "History", "Science", "Calculus", "Essay Writing", "Computer Science"];

type Step = "details" | "payment" | "confirmed";

export default function BookSession() {
  const [, params] = useRoute("/parent/book/:tutorId");
  const tutorId = Number(params?.tutorId);
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { user } = useAuth();

  const tutor = useGetTutor(tutorId);
  const availability = useGetTutorAvailability(tutorId);
  const allStudents = useListStudents();
  const createSession = useCreateSession();
  const simulatePayment = useSimulatePayment();

  const myStudents = allStudents.data?.filter((s) => s.parentId === user?.id) ?? [];

  const [step, setStep] = useState<Step>("details");
  const [selectedStudentId, setSelectedStudentId] = useState<number>(0);

  useEffect(() => {
    if (myStudents.length === 1 && selectedStudentId === 0) {
      setSelectedStudentId(myStudents[0].id);
    }
  }, [myStudents.length]);

  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [createdSession, setCreatedSession] = useState<any>(null);
  const [error, setError] = useState("");

  const totalAmount = tutor.data ? (tutor.data.hourlyRate * duration) / 60 : 0;
  const selectedStudent = myStudents.find((s) => s.id === selectedStudentId);

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedStudentId) { setError("Please select a student"); return; }
    if (!subject) { setError("Please select a subject"); return; }
    if (!date || !time) { setError("Please select a date and time"); return; }

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    createSession.mutate(
      { data: { tutorId, studentId: selectedStudentId, subject, scheduledAt, durationMinutes: duration } },
      {
        onSuccess: (session) => {
          setCreatedSession(session);
          setStep("payment");
          qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        },
        onError: () => setError("Could not create session. Please try again."),
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

  if (tutor.isLoading) {
    return <div className="p-6"><div className="h-8 bg-muted rounded animate-pulse" /></div>;
  }

  if (!tutor.data) {
    return <div className="p-6 text-sm text-muted-foreground">Tutor not found.</div>;
  }

  /* ── Confirmation screen ──────────────────────────────────────────────── */
  if (step === "confirmed") {
    const scheduledDate = date && time ? new Date(`${date}T${time}:00`) : null;

    return (
      <div className="p-4 md:p-6 max-w-sm mx-auto pt-10">
        {/* Success icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Session Booked!</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Payment processed. Your session is confirmed.
          </p>
        </div>

        {/* Session details card */}
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session Details</p>
          </div>
          <div className="px-4 py-3 divide-y divide-border">
            <div className="flex justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Tutor</span>
              <span className="text-sm font-semibold text-foreground">{tutor.data.firstName} {tutor.data.lastName}</span>
            </div>
            {selectedStudent && (
              <div className="flex justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Student</span>
                <span className="text-sm font-semibold text-foreground">{selectedStudent.firstName} {selectedStudent.lastName}</span>
              </div>
            )}
            <div className="flex justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Subject</span>
              <span className="text-sm font-semibold text-foreground">{subject}</span>
            </div>
            {scheduledDate && (
              <div className="flex justify-between py-2.5">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar size={13} />
                  Date & time
                </span>
                <span className="text-sm font-semibold text-foreground text-right">
                  {format(scheduledDate, "EEE, MMM d")}
                  <br />
                  <span className="font-normal text-muted-foreground">{format(scheduledDate, "h:mm a")}</span>
                </span>
              </div>
            )}
            <div className="flex justify-between py-2.5">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock size={13} />
                Duration
              </span>
              <span className="text-sm font-semibold text-foreground">{duration} min</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Amount paid</span>
              <span className="text-sm font-bold text-accent">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Next steps */}
        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 mb-5">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Next Steps</p>
          <div className="space-y-2.5">
            {[
              { icon: Bell, text: "You'll receive a reminder email 24 hours before the session" },
              { icon: Clock, text: "Join your session a few minutes early to get settled" },
              { icon: CheckCircle, text: "After the session, your tutor will log progress notes for you" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={11} className="text-primary" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Link
            href="/parent/dashboard"
            className="flex items-center justify-between w-full py-3 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
            <ChevronRight size={16} />
          </Link>
          <Link
            href="/settings"
            className="flex items-center justify-between w-full py-3 px-4 rounded-xl bg-card border border-card-border text-sm font-medium text-foreground hover:border-primary/40 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Bell size={14} className="text-muted-foreground" />
              Manage Notifications
            </span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        </div>
      </div>
    );
  }

  /* ── Payment screen ───────────────────────────────────────────────────── */
  if (step === "payment") {
    return (
      <div className="p-4 md:p-6 max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep("details")} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-foreground">Pay before session</h1>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">Order summary</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tutor</span>
              <span className="font-medium text-foreground">{tutor.data.firstName} {tutor.data.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subject</span>
              <span className="font-medium text-foreground">{subject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium text-foreground">{duration} min</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-foreground text-base">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">Demo Payment</span>
          </div>
          <div className="space-y-2">
            <input disabled value="4242 4242 4242 4242" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-muted-foreground" readOnly />
            <div className="grid grid-cols-2 gap-2">
              <input disabled value="12/28" className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-muted-foreground" readOnly />
              <input disabled value="123" className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-muted-foreground" readOnly />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">This is a simulated payment — no real charges.</p>
        </div>

        {error && <p className="text-sm text-destructive mb-3">{error}</p>}

        <button
          onClick={handlePayment}
          disabled={simulatePayment.isPending}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {simulatePayment.isPending ? "Processing..." : `Pay $${totalAmount.toFixed(2)}`}
        </button>
      </div>
    );
  }

  /* ── Details form ─────────────────────────────────────────────────────── */
  return (
    <div className="p-4 md:p-6 max-w-sm mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/parent/tutors" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Book a Session</h1>
      </div>

      {/* Tutor info */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{tutor.data.firstName} {tutor.data.lastName}</p>
            <p className="text-xs text-muted-foreground">${tutor.data.hourlyRate}/hr · {tutor.data.subjects.join(", ")}</p>
          </div>
        </div>
        {availability.data && availability.data.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Available:</p>
            <div className="flex flex-wrap gap-1">
              {availability.data.map((slot) => (
                <span key={slot.id} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {DAYS[slot.dayOfWeek]} {slot.startTime}–{slot.endTime}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleBooking} className="space-y-4">
        {/* Student selector */}
        {allStudents.isLoading ? (
          <div className="h-11 rounded-lg bg-muted animate-pulse" />
        ) : myStudents.length === 0 ? (
          <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-dashed border-border bg-muted/30">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Baby size={15} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">No students added yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Add a student before booking a session</p>
              <Link
                href="/parent/students"
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus size={12} />
                Add a student
              </Link>
            </div>
          </div>
        ) : myStudents.length === 1 ? (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Student</label>
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-input bg-muted/40">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-primary">
                  {myStudents[0].firstName[0]}{myStudents[0].lastName[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{myStudents[0].firstName} {myStudents[0].lastName}</p>
                {myStudents[0].gradeLevel && <p className="text-[11px] text-muted-foreground">{myStudents[0].gradeLevel}</p>}
              </div>
              <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">Auto-selected</span>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value={0}>Select a student...</option>
              {myStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}{s.gradeLevel ? ` · ${s.gradeLevel}` : ""}
                </option>
              ))}
            </select>
            <Link href="/parent/students" className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors">
              <Plus size={10} /> Add another student
            </Link>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Subject</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            required
          >
            <option value="">Select a subject...</option>
            {SUBJECTS.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Duration</label>
          <div className="flex gap-2">
            {[30, 60, 90, 120].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                  duration === d
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>

        <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total amount</span>
          <span className="text-base font-bold text-foreground">${totalAmount.toFixed(2)}</span>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={createSession.isPending}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {createSession.isPending ? "Creating session..." : "Continue to Payment"}
        </button>
      </form>
    </div>
  );
}
