import { useState, useEffect } from "react";
import { useListStudents, useCreateStudent, useUpdateStudent, useRemoveStudent } from "@workspace/api-client-react";
import { Link } from "wouter";
import { getListStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  GraduationCap, Plus, X, CheckCircle, AlertCircle, User,
  TrendingUp, ChevronDown, ChevronUp, Star, Shield, BookOpen, Pencil, Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";

const YEAR_LEVELS = [
  "Prep",
  "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6",
  "Year 7", "Year 8", "Year 9", "Year 10",
  "VCE Year 11", "VCE Year 12",
  "Other",
];

const SUBJECT_OPTIONS = [
  "Maths", "English", "Science", "Biology", "Chemistry", "Physics",
  "History", "Geography", "Economics", "Accounting", "Legal Studies",
  "Psychology", "Further Maths", "Specialist Maths", "Literature",
  "French", "Japanese", "Chinese", "Music", "Art", "PE",
];

interface ProgressEntry {
  id: number;
  sessionId: number;
  score: number;
  notes: string | null;
  subject: string;
  scheduledAt: string;
  durationMinutes: number;
  createdAt: string;
}

function apiError(error: unknown, fallback: string): { status?: number; message: string } {
  const e = error as { status?: number; data?: { error?: unknown; message?: unknown }; message?: string };
  const msg = typeof e?.data?.error === "string" ? e.data.error : typeof e?.data?.message === "string" ? e.data.message : fallback;
  return { status: e?.status, message: msg };
}

const inputCls = "w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";

type CardStudent = StudentCardProps["student"];

function fullName(s: { firstName: string; lastName?: string | null }) {
  return [s.firstName, s.lastName ?? ""].join(" ").trim();
}

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-sm bg-card border border-card-border rounded-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditStudentModal({ student, onClose, onSaved }: { student: CardStudent; onClose: () => void; onSaved: (msg: string) => void }) {
  const update = useUpdateStudent();
  const [firstName, setFirstName] = useState(student.firstName);
  const [lastName, setLastName] = useState(student.lastName ?? "");
  const [yearLevel, setYearLevel] = useState(student.yearLevel ?? "");
  const [school, setSchool] = useState(student.school ?? "");
  const [subjects, setSubjects] = useState<string[]>(student.subjects ? student.subjects.split(",").map((x) => x.trim()).filter(Boolean) : []);
  const [goals, setGoals] = useState(student.goals ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : "");
  const [error, setError] = useState("");
  const toggle = (sub: string) => setSubjects((p) => (p.includes(sub) ? p.filter((x) => x !== sub) : [...p, sub]));
  const subjectOptions = Array.from(new Set([...SUBJECT_OPTIONS, ...subjects]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    update.mutate(
      {
        studentId: student.id,
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim() || null,
          yearLevel: yearLevel || null,
          school: school.trim() || null,
          subjects: subjects.length ? subjects.join(", ") : null,
          goals: goals.trim() || null,
          dateOfBirth: dateOfBirth || null,
        },
      },
      {
        onSuccess: (s) => onSaved(`${fullName(s)}'s profile was updated.`),
        onError: (err) => setError(apiError(err, "Could not save changes. Please check the details and try again.").message),
      },
    );
  };

  return (
    <ModalShell title="Edit student profile" subtitle="Changes apply to this profile only" onClose={onClose}>
      <form onSubmit={submit} className="p-5 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs" role="alert">
            <AlertCircle size={13} className="shrink-0" />{error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-foreground mb-1.5">First name</span>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={100} className={inputCls} data-testid="input-edit-first-name" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-foreground mb-1.5">Last name</span>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} className={inputCls} data-testid="input-edit-last-name" />
          </label>
        </div>
        <label className="block">
          <span className="block text-xs font-medium text-foreground mb-1.5">Year level</span>
          <select value={yearLevel} onChange={(e) => setYearLevel(e.target.value)} className={inputCls} data-testid="select-edit-year-level">
            <option value="">Not set</option>
            {Array.from(new Set([...YEAR_LEVELS, ...(yearLevel ? [yearLevel] : [])])).map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <div>
          <span className="block text-xs font-medium text-foreground mb-2">Subjects</span>
          <div className="flex flex-wrap gap-1.5">
            {subjectOptions.map((sub) => (
              <button key={sub} type="button" onClick={() => toggle(sub)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${subjects.includes(sub) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {sub}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="block text-xs font-medium text-foreground mb-1.5">School</span>
          <input value={school} onChange={(e) => setSchool(e.target.value)} maxLength={200} className={inputCls} data-testid="input-edit-school" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-foreground mb-1.5">Learning goals</span>
          <textarea value={goals} onChange={(e) => setGoals(e.target.value)} maxLength={2000} rows={2} className={`${inputCls} resize-none`} data-testid="input-edit-goals" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-foreground mb-1.5">Date of birth</span>
          <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputCls} data-testid="input-edit-dob" />
        </label>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          <button type="submit" disabled={update.isPending || !firstName.trim()} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity" data-testid="button-save-student">
            {update.isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function RemoveStudentModal({ student, onClose, onRemoved }: { student: CardStudent; onClose: () => void; onRemoved: (msg: string) => void }) {
  const remove = useRemoveStudent();
  const target = fullName(student);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const matches = typed.trim() === target;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matches) return;
    setError(null);
    remove.mutate(
      { studentId: student.id, data: { confirmationName: typed.trim() } },
      {
        onSuccess: (result) => onRemoved(result.message),
        onError: (err) => setError(apiError(err, "Could not remove this profile. Please try again.")),
      },
    );
  };

  return (
    <ModalShell title="Remove student profile" subtitle={target} onClose={onClose}>
      <form onSubmit={submit} className="p-5 space-y-4">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
          <p>If this student has their own linked sign-in, it will be disabled.</p>
          <p>If the profile has lesson, invoice or payment history, it is archived and kept in restricted form for legal, financial and dispute records. A profile that was never used is deleted.</p>
          <p>Students with upcoming booked lessons cannot be removed until those lessons are cancelled or resolved.</p>
        </div>
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs space-y-1.5" role="alert" data-testid="text-remove-error">
            <p className="flex items-start gap-2"><AlertCircle size={13} className="mt-0.5 shrink-0" />{error.message}</p>
            {error.status === 409 && (
              <p className="pl-5">
                Cancel or resolve the upcoming lessons first in{" "}
                <Link href="/parent/sessions" className="font-semibold underline" data-testid="link-resolve-sessions">Sessions</Link>, then try again.
              </p>
            )}
          </div>
        )}
        <label className="block">
          <span className="block text-xs font-medium text-foreground mb-1.5">
            Type <span className="font-semibold">{target}</span> to confirm
          </span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={inputCls} data-testid="input-confirm-student-name" />
        </label>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          <button type="submit" disabled={!matches || remove.isPending} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity" data-testid="button-confirm-remove-student">
            {remove.isPending ? "Removing..." : "Remove profile"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function getToken() { return localStorage.getItem("scholix_token") ?? ""; }

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score <= 3 ? "bg-red-400" : score <= 5 ? "bg-amber-400" : score <= 7 ? "bg-primary" : "bg-accent";
  const label = score <= 3 ? "Needs support" : score <= 5 ? "Developing" : score <= 7 ? "On track" : "Excelling";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground shrink-0 w-20">{score}/10 · {label}</span>
    </div>
  );
}

function ProgressTimeline({ studentId }: { studentId: number }) {
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students/${studentId}/progress`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setEntries(Array.isArray(data) ? data.reverse() : []);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="space-y-2 mt-3">
        {[1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="mt-3 py-4 text-center border border-dashed border-border rounded-xl">
        <TrendingUp size={20} className="text-muted-foreground mx-auto mb-1.5" />
        <p className="text-xs text-muted-foreground">No progress logged yet.</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Progress is logged by tutors after each session.</p>
      </div>
    );
  }

  const avgScore = entries.reduce((s, e) => s + e.score, 0) / entries.length;
  const recent3 = entries.slice(0, 3);
  const recent3Avg = recent3.reduce((s, e) => s + e.score, 0) / recent3.length;
  const older = entries.slice(3);
  const trend = older.length > 0 ? recent3Avg - (older.reduce((s, e) => s + e.score, 0) / older.length) : null;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
        <div className="text-center shrink-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Score</p>
          <p className="text-lg font-bold text-foreground">{avgScore.toFixed(1)}</p>
        </div>
        <div className="flex-1">
          <ScoreBar score={Math.round(avgScore)} />
          {trend !== null && (
            <p className={`text-[10px] mt-1 font-medium ${trend >= 0 ? "text-accent" : "text-destructive"}`}>
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)} pts vs previous sessions
            </p>
          )}
        </div>
        <div className="text-center shrink-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sessions</p>
          <p className="text-lg font-bold text-foreground">{entries.length}</p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-3 pl-8">
          {entries.map((entry) => {
            const scoreColor = entry.score <= 3 ? "bg-red-400" : entry.score <= 5 ? "bg-amber-400" : entry.score <= 7 ? "bg-primary" : "bg-accent";
            return (
              <div key={entry.id} className="relative">
                <div className={`absolute -left-5 top-3 w-3 h-3 rounded-full border-2 border-card ${scoreColor}`} />
                <div className="bg-card border border-card-border rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{entry.subject}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(parseISO(entry.scheduledAt), "EEE, MMM d yyyy")} · {entry.durationMinutes}min
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star size={11} className={entry.score >= 8 ? "text-amber-500 fill-amber-500" : "text-muted-foreground"} />
                      <span className="text-sm font-bold text-foreground">{entry.score}/10</span>
                    </div>
                  </div>
                  <ScoreBar score={entry.score} />
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t border-border pt-2">
                      {entry.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface StudentCardProps {
  student: {
    id: number;
    firstName: string;
    lastName?: string | null;
    yearLevel?: string | null;
    school?: string | null;
    subjects?: string | null;
    goals?: string | null;
    dateOfBirth?: string | null;
    isIdentityVerified?: boolean;
    createdAt: string;
  };
}

function StudentCard({ student, onChanged }: StudentCardProps & { onChanged: (msg: string, studentId: number) => void }) {
  const [showProgress, setShowProgress] = useState(false);
  const [mode, setMode] = useState<"edit" | "remove" | null>(null);
  const initials = student.lastName
    ? `${student.firstName[0]}${student.lastName[0]}`.toUpperCase()
    : student.firstName.slice(0, 2).toUpperCase();
  const displayName = student.lastName
    ? `${student.firstName} ${student.lastName}`
    : student.firstName;

  const subjectList = student.subjects
    ? student.subjects.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      {mode === "edit" && (
        <EditStudentModal student={student} onClose={() => setMode(null)} onSaved={(m) => { setMode(null); onChanged(m, student.id); }} />
      )}
      {mode === "remove" && (
        <RemoveStudentModal student={student} onClose={() => setMode(null)} onRemoved={(m) => { setMode(null); onChanged(m, student.id); }} />
      )}
      <div className="p-4 grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            {student.isIdentityVerified && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold">
                <Shield size={9} /> Verified
              </span>
            )}
          </div>
          {student.yearLevel && (
            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
              {student.yearLevel}
            </span>
          )}
          {student.school && (
            <p className="text-xs text-muted-foreground mt-1">{student.school}</p>
          )}
          {subjectList.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {subjectList.map((s) => (
                <span key={s} className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-medium">
                  {s}
                </span>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Added {format(parseISO(student.createdAt), "MMM d, yyyy")}
          </p>
        </div>
        <button
          onClick={() => setShowProgress(!showProgress)}
          className="col-start-2 sm:col-start-3 sm:row-start-1 justify-self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
        >
          <TrendingUp size={12} />
          Progress
          {showProgress ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {student.goals && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Goals: </span>{student.goals}
          </p>
        </div>
      )}

      {showProgress && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <TrendingUp size={13} className="text-primary" />
            Learning Progress Timeline
          </p>
          <ProgressTimeline studentId={student.id} />
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-border flex justify-end gap-2">
        <button type="button" onClick={() => setMode("edit")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" data-testid={`button-edit-student-${student.id}`}>
          <Pencil size={12} /> Edit
        </button>
        <button type="button" onClick={() => setMode("remove")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors" data-testid={`button-remove-student-${student.id}`}>
          <Trash2 size={12} /> Remove
        </button>
      </div>
    </div>
  );
}

function AddStudentModal({
  parentId,
  onClose,
  onSuccess,
}: {
  parentId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const createStudent = useCreateStudent();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [school, setSchool] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [goals, setGoals] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  const toggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    createStudent.mutate(
      {
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          yearLevel: yearLevel || undefined,
          school: school.trim() || undefined,
          subjects: selectedSubjects.length > 0 ? selectedSubjects.join(", ") : undefined,
          goals: goals.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
          parentId,
        } as any,
      },
      {
        onSuccess: async (newStudent) => {
          if (dateOfBirth && verified && newStudent?.id) {
            try {
              await fetch(`/api/students/${newStudent.id}/verify-identity`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ dateOfBirth, declaration: true }),
              });
            } catch {}
          }
          onSuccess();
        },
        onError: () => setError("Could not add student. Please check the details and try again."),
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card border border-card-border rounded-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-base font-bold text-foreground">Add student profile</h2>
            <p className="text-xs text-muted-foreground mt-0.5">No account needed. You manage everything</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          {/* Explanation banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15">
            <BookOpen size={14} className="text-primary mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Students don't need their own account. You manage bookings and payments on their behalf.
            </p>
          </div>

          {/* Required fields */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-3">Required</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Emma"
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Last name <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Year level</label>
            <select
              value={yearLevel}
              onChange={(e) => setYearLevel(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select year level...</option>
              {YEAR_LEVELS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-2">
              Subjects needed
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SUBJECT_OPTIONS.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => toggleSubject(sub)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    selectedSubjects.includes(sub)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
            {selectedSubjects.length === 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">Select at least one subject</p>
            )}
          </div>

          {/* Optional fields */}
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-semibold text-foreground">Optional</p>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">School</label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. Melbourne High School"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Learning goals</label>
              <textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="e.g. Improve confidence in algebra, prepare for SAC exams..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors resize-none"
              />
            </div>
          </div>

          {/* Identity verification */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-primary" />
              <p className="text-xs font-semibold text-foreground">Identity verification</p>
              <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Providing your child's date of birth helps tutors verify the student's identity for safeguarding and age-appropriate teaching.
            </p>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Date of birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {dateOfBirth && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  I declare that the information provided is accurate and this student is a unique individual. I understand that misuse of commission-free session benefits may result in account suspension.
                </p>
              </label>
            )}
            {dateOfBirth && verified && (
              <div className="flex items-center gap-1.5 text-accent text-[11px] font-semibold">
                <CheckCircle size={12} />
                Identity declared
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createStudent.isPending || selectedSubjects.length === 0 || !yearLevel}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-1.5"
            >
              {createStudent.isPending ? "Adding..." : <><Plus size={14} /> Add student profile</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ParentStudents() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const students = useListStudents();
  const [showModal, setShowModal] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleChanged = async (msg: string, studentId: number) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: getListStudentsQueryKey() }),
      qc.invalidateQueries({ queryKey: [`/api/students/${studentId}/progress`] }),
      qc.invalidateQueries({ queryKey: [`/api/students/${studentId}`] }),
    ]);
    setNotice(msg);
    setTimeout(() => setNotice(null), 6000);
  };

  const myStudents = students.data?.filter(
    (s) => s.parentId === user?.id
  ) ?? [];

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: getListStudentsQueryKey() });
    students.refetch().then((result) => {
      const newest = result.data
        ?.filter((s) => s.parentId === user?.id)
        .at(-1);
      if (newest) {
        const name = newest.lastName
          ? `${newest.firstName} ${newest.lastName}`
          : newest.firstName;
        setJustAdded(name);
        setTimeout(() => setJustAdded(null), 4000);
      }
    });
    setShowModal(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      {showModal && user && (
        <AddStudentModal
          parentId={user.id}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Students</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {myStudents.length} student{myStudents.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={15} />
          Add student
        </button>
      </div>

      {/* Explanation banner */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-primary/5 border border-primary/15 mb-5">
        <User size={14} className="text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-foreground">Managing students is simple</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Students don't need their own account. You manage bookings and payments on their behalf.
          </p>
        </div>
      </div>

      {justAdded && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/10 text-accent text-sm font-medium mb-4 border border-accent/20">
          <CheckCircle size={16} />
          {justAdded}'s profile has been created successfully!
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-accent/10 text-accent text-sm font-medium mb-4 border border-accent/20" role="status" data-testid="text-student-notice">
          <CheckCircle size={16} className="mt-0.5 shrink-0" />
          {notice}
        </div>
      )}

      {students.isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : myStudents.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={24} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">No students yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Add your children so you can book tutoring sessions for them
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={15} />
            Add your first student
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {myStudents.map((student) => (
            <StudentCard key={student.id} student={student as any} onChanged={handleChanged} />
          ))}
          <button
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Plus size={16} />
            Add another student profile
          </button>
        </div>
      )}

      <div className="mt-6 bg-muted/50 border border-border rounded-xl p-4">
        <div className="flex items-start gap-2">
          <TrendingUp size={14} className="text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground">How progress tracking works</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              After each completed session, your tutor logs a progress score and notes. Tap "Progress" on any student card to see their learning timeline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
