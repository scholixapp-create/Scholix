import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useGetTutor, useGetTutorAvailability, useListStudents, useCreateSession, useSimulatePayment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListSessionsQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, CheckCircle, CreditCard, GraduationCap } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "English Literature", "History", "Science", "Calculus", "Essay Writing", "Computer Science"];

type Step = "details" | "payment" | "confirmed";

export default function BookSession() {
  const [, params] = useRoute("/parent/book/:tutorId");
  const tutorId = Number(params?.tutorId);
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const tutor = useGetTutor(tutorId);
  const availability = useGetTutorAvailability(tutorId);
  const students = useListStudents();
  const createSession = useCreateSession();
  const simulatePayment = useSimulatePayment();

  const [step, setStep] = useState<Step>("details");
  const [selectedStudentId, setSelectedStudentId] = useState<number>(0);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [createdSession, setCreatedSession] = useState<any>(null);
  const [error, setError] = useState("");

  const totalAmount = tutor.data ? (tutor.data.hourlyRate * duration) / 60 : 0;

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedStudentId) { setError("Please select a student"); return; }
    if (!subject) { setError("Please select a subject"); return; }
    if (!date || !time) { setError("Please select a date and time"); return; }

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    createSession.mutate(
      { tutorId, studentId: selectedStudentId, subject, scheduledAt, durationMinutes: duration },
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
      { sessionId: createdSession.id },
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

  if (step === "confirmed") {
    return (
      <div className="p-4 md:p-6 max-w-sm mx-auto text-center pt-16">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-accent" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Session booked!</h1>
        <p className="text-sm text-muted-foreground mt-2">Your session with {tutor.data.firstName} has been confirmed and payment processed.</p>
        <div className="mt-6 bg-card border border-card-border rounded-xl p-4 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subject</span>
            <span className="font-medium text-foreground">{subject}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium text-foreground">{duration} min</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount paid</span>
            <span className="font-medium text-accent">${totalAmount.toFixed(2)}</span>
          </div>
        </div>
        <Link
          href="/parent/dashboard"
          className="block mt-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

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
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Student</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            required
          >
            <option value={0}>Select a student...</option>
            {students.data?.map((s) => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Subject</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            required
          >
            <option value="">Select a subject...</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
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
