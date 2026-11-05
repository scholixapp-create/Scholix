import { useState } from "react";
import { useDecideEducation } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { GraduationCap, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export interface EducationFields {
  id: number;
  educationDetails?: string | null;
  pendingEducationDetails?: string | null;
  educationReviewStatus?: "none" | "pending" | "approved" | "rejected" | string | null;
  educationReviewNotes?: string | null;
  educationSubmittedAt?: string | null;
}

export function hasPendingEducation(t: EducationFields) {
  return t.educationReviewStatus === "pending" && !!t.pendingEducationDetails && !!t.educationSubmittedAt;
}

function safeDate(v?: string | null) {
  if (!v) return null;
  try { return format(parseISO(v), "d MMM yyyy, h:mm a"); } catch { return null; }
}

export default function EducationReviewPanel({ tutor, onDecided }: { tutor: EducationFields; onDecided: () => void | Promise<void> }) {
  const decide = useDecideEducation();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  if (!hasPendingEducation(tutor)) {
    return done ? <p role="status" className="text-xs text-accent" data-testid={`text-education-decided-${tutor.id}`}>{done}</p> : null;
  }

  const act = (action: "approve" | "reject") => {
    setError("");
    setDone("");
    decide.mutate(
      {
        tutorId: tutor.id,
        data: { action, expectedSubmittedAt: tutor.educationSubmittedAt as string, ...(notes.trim() ? { notes: notes.trim() } : {}) },
      },
      {
        onSuccess: async () => {
          setNotes("");
          setDone(action === "approve" ? "Qualification update approved and published." : "Qualification update rejected.");
          await onDecided();
        },
        onError: async (err) => {
          const e = err as { status?: number; data?: { error?: unknown } };
          if (e?.status === 409) {
            setError("This proposal changed since you loaded it. The latest version has been loaded; review it again before deciding.");
            await onDecided();
          } else {
            setError(typeof e?.data?.error === "string" ? e.data.error : "Could not save the decision. Please try again.");
          }
        },
      },
    );
  };

  const submitted = safeDate(tutor.educationSubmittedAt);

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3" aria-label="Pending qualification update" data-testid={`panel-education-review-${tutor.id}`}>
      <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
        <GraduationCap size={13} /> Qualification update pending{submitted ? ` (submitted ${submitted})` : ""}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 text-xs">
        <div>
          <p className="text-muted-foreground mb-0.5">Currently approved</p>
          <p className="text-foreground whitespace-pre-wrap break-words">{tutor.educationDetails || "None"}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">Proposed</p>
          <p className="text-foreground font-medium whitespace-pre-wrap break-words">{tutor.pendingEducationDetails}</p>
        </div>
      </div>
      <label className="block">
        <span className="text-[11px] text-muted-foreground">Notes for the tutor (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={2} className="mt-1 w-full text-xs px-3 py-2 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" data-testid={`input-education-notes-${tutor.id}`} />
      </label>
      {error && <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive"><AlertCircle size={12} className="mt-0.5 shrink-0" /> {error}</p>}
      {done && <p role="status" className="text-xs text-accent">{done}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => act("approve")} disabled={decide.isPending} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60" data-testid={`button-approve-education-${tutor.id}`}>
          <CheckCircle size={13} /> Approve qualifications
        </button>
        <button type="button" onClick={() => act("reject")} disabled={decide.isPending} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-destructive/40 text-destructive text-xs font-semibold hover:bg-destructive/5 disabled:opacity-60" data-testid={`button-reject-education-${tutor.id}`}>
          <XCircle size={13} /> Reject update
        </button>
      </div>
    </section>
  );
}
