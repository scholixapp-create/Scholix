import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyEducation,
  useSubmitEducation,
  getGetMyEducationQueryKey,
} from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { GraduationCap, Clock, XCircle, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

function errorMessage(err: unknown, fallback: string) {
  const e = err as { data?: { error?: unknown }; message?: string };
  if (typeof e?.data?.error === "string") return e.data.error;
  return fallback;
}

function safeDate(value: string | null | undefined) {
  if (!value) return null;
  try { return format(parseISO(value), "d MMM yyyy, h:mm a"); } catch { return null; }
}

export default function QualificationsEditor() {
  const qc = useQueryClient();
  const education = useGetMyEducation();
  const submit = useSubmitEducation();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const initialised = useRef(false);

  const data = education.data;
  useEffect(() => {
    if (data && !initialised.current) {
      initialised.current = true;
      setDraft(data.pendingEducationDetails ?? data.educationDetails ?? "");
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const value = draft.trim();
    if (!value) { setError("Enter your qualifications before submitting."); return; }
    if (value.length > 5000) { setError("Qualifications must be 5000 characters or fewer."); return; }
    submit.mutate(
      { data: { educationDetails: value } },
      {
        onSuccess: (updated) => {
          qc.setQueryData(getGetMyEducationQueryKey(), updated);
          setSuccess("Submitted for review. Your approved qualifications stay visible until an admin approves the change.");
        },
        onError: (err) => setError(errorMessage(err, "We could not submit your qualifications. Please try again.")),
      },
    );
  };

  const submittedAt = safeDate(data?.educationSubmittedAt);

  return (
    <section className="bg-card border border-card-border rounded-2xl overflow-hidden" aria-labelledby="qualifications-heading" data-testid="section-qualifications">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
        <GraduationCap size={16} className="text-primary" />
        <div>
          <h2 id="qualifications-heading" className="text-sm font-semibold text-foreground">Qualifications</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Changes are reviewed by an admin before they appear on your public profile.</p>
        </div>
      </div>

      {education.isLoading ? (
        <div className="p-5 space-y-3" aria-label="Loading qualifications">
          <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
          <div className="h-16 rounded-lg bg-muted animate-pulse" />
        </div>
      ) : education.isError || !data ? (
        <div className="p-5 text-center">
          <p className="text-sm text-muted-foreground">We could not load your qualifications.</p>
          <button type="button" onClick={() => education.refetch()} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted" data-testid="button-qualifications-retry">
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Approved and published</p>
            {data.educationDetails ? (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words" data-testid="text-approved-education">{data.educationDetails}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No approved qualifications yet.</p>
            )}
          </div>

          {data.educationReviewStatus === "pending" && data.pendingEducationDetails && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3" data-testid="status-education-pending">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5"><Clock size={12} /> Awaiting admin review{submittedAt ? ` (submitted ${submittedAt})` : ""}</p>
              <p className="text-sm text-amber-900 mt-1.5 whitespace-pre-wrap break-words">{data.pendingEducationDetails}</p>
            </div>
          )}
          {data.educationReviewStatus === "rejected" && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3" data-testid="status-education-rejected">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1.5"><XCircle size={12} /> Your last proposed change was not approved</p>
              {data.educationReviewNotes && <p className="text-sm text-foreground mt-1.5 whitespace-pre-wrap break-words">Admin notes: {data.educationReviewNotes}</p>}
            </div>
          )}
          {data.educationReviewStatus === "approved" && (
            <p className="text-xs text-accent flex items-center gap-1.5" data-testid="status-education-approved"><CheckCircle size={12} /> Your latest change was approved.</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-2">
            <label htmlFor="qualifications-draft" className="block text-sm font-medium text-foreground">
              {data.educationReviewStatus === "pending" ? "Update your proposed qualifications" : "Propose updated qualifications"}
            </label>
            <textarea
              id="qualifications-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              maxLength={5000}
              aria-describedby="qualifications-help"
              placeholder="e.g. VCE ATAR 98.5, Bachelor of Science (Mathematics), University of Melbourne"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              data-testid="input-qualifications"
            />
            <p id="qualifications-help" className="text-[11px] text-muted-foreground">
              Submitting replaces any earlier pending proposal. Your approved details above remain on your profile until an admin approves the change.
            </p>
            {error && <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive"><AlertCircle size={12} /> {error}</p>}
            {success && <p role="status" className="text-xs text-accent">{success}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={submit.isPending} className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60" data-testid="button-submit-qualifications">
                {submit.isPending ? "Submitting..." : "Submit for review"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
