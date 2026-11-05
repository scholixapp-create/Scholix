import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSessionReview,
  useCreateSessionReview,
  getGetSessionReviewQueryKey,
  getListTutorReviewsQueryKey,
  type Session,
  type SessionReviewState,
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, AlertCircle, RefreshCw, CheckCircle2, Lock } from "lucide-react";
import { format, parseISO } from "date-fns";

const MAX_COMMENT = 2000;

function Stars({ value, onChange, disabled }: { value: number; onChange?: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1" role={onChange ? "radiogroup" : undefined} aria-label={onChange ? "Rating" : `Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            disabled={disabled}
            onClick={() => onChange(n)}
            data-testid={`button-rating-${n}`}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <Star size={26} className={n <= value ? "text-brand-gold fill-brand-gold" : "text-gray-300"} />
          </button>
        ) : (
          <Star key={n} size={18} className={n <= value ? "text-brand-gold fill-brand-gold" : "text-gray-300"} />
        ),
      )}
    </div>
  );
}

function errorStatus(err: unknown): number | undefined {
  return typeof err === "object" && err && "status" in err ? Number((err as { status: unknown }).status) : undefined;
}

export default function SessionReviewDialog({ session, onClose }: { session: Session; onClose: () => void }) {
  const queryClient = useQueryClient();
  const reviewKey = getGetSessionReviewQueryKey(session.id);
  const state = useGetSessionReview(session.id, { query: { queryKey: reviewKey, retry: false } });
  const create = useCreateSessionReview();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setRating(0); setComment(""); setConfirming(false); setSubmitError(""); setJustSaved(false);
  }, [session.id]);

  const submit = () => {
    if (create.isPending || rating < 1 || rating > 5) return;
    setSubmitError("");
    const trimmed = comment.trim();
    create.mutate(
      { sessionId: session.id, data: { rating, ...(trimmed ? { comment: trimmed } : {}) } },
      {
        onSuccess: (review) => {
          queryClient.setQueryData<SessionReviewState>(reviewKey, { eligible: false, review });
          queryClient.invalidateQueries({ queryKey: reviewKey });
          queryClient.invalidateQueries({ queryKey: getListTutorReviewsQueryKey(review.tutorId ?? session.tutorId) });
          setJustSaved(true);
          setConfirming(false);
        },
        onError: (err) => {
          const status = errorStatus(err);
          setConfirming(false);
          if (status === 409) {
            setSubmitError("You have already reviewed this tutor. Showing your saved review.");
            queryClient.invalidateQueries({ queryKey: reviewKey });
          } else if (status === 403 || status === 404) {
            setSubmitError("This session is not available for review.");
            queryClient.invalidateQueries({ queryKey: reviewKey });
          } else {
            setSubmitError("We could not save your review. Please try again.");
          }
        },
      },
    );
  };

  const review = state.data?.review ?? null;
  const when = (() => { try { return format(parseISO(session.scheduledAt), "EEE, MMM d 'at' h:mm a"); } catch { return ""; } })();

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !create.isPending) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto" data-testid="dialog-session-review">
        <DialogHeader>
          <DialogTitle>Review {session.tutorName ?? "your tutor"}</DialogTitle>
          <DialogDescription>{session.subject}{when ? ` on ${when}` : ""}</DialogDescription>
        </DialogHeader>

        {submitError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="alert" data-testid="text-review-error">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {submitError}
          </div>
        )}

        {state.isLoading ? (
          <div className="space-y-3" data-testid="status-review-loading">
            <div className="h-8 w-40 rounded-lg bg-muted animate-pulse" />
            <div className="h-24 rounded-lg bg-muted animate-pulse" />
          </div>
        ) : state.isError ? (
          <div className="text-center py-4" data-testid="status-review-load-error">
            <p className="text-sm text-muted-foreground mb-3">
              {errorStatus(state.error) === 403 || errorStatus(state.error) === 404
                ? "This session is not available for review."
                : "We could not load the review for this session."}
            </p>
            <button
              type="button"
              onClick={() => state.refetch()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              data-testid="button-review-retry"
            >
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        ) : review ? (
          <div className="space-y-3" data-testid="status-review-saved">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-teal">
              <CheckCircle2 size={16} /> {justSaved ? "Thanks, your review is saved" : "Your review of this tutor"}
            </div>
            <Stars value={review.rating} />
            {review.comment ? (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words" data-testid="text-review-comment">{review.comment}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No comment added.</p>
            )}
            <p className="text-xs text-muted-foreground">Families leave one review per tutor, covering all sessions. Reviews cannot be edited once submitted.</p>
          </div>
        ) : !state.data?.eligible ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground" data-testid="status-review-ineligible">
            <Lock size={14} className="shrink-0 mt-0.5" />
            This session is not eligible for a review.
          </div>
        ) : confirming ? (
          <div className="space-y-4" data-testid="status-review-confirm">
            <p className="text-sm text-foreground">Submit this review? You can leave one review per tutor. It will appear on the tutor's public profile and cannot be changed.</p>
            <Stars value={rating} />
            {comment.trim() && <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{comment.trim()}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={create.isPending}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-60 transition-colors"
                data-testid="button-review-edit"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={create.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                data-testid="button-review-confirm"
              >
                {create.isPending ? "Submitting..." : "Confirm and submit"}
              </button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); if (rating >= 1) setConfirming(true); }}
          >
            <div>
              <p className="text-sm font-medium text-foreground mb-1">How was this session?</p>
              <Stars value={rating} onChange={setRating} />
            </div>
            <div>
              <label htmlFor="review-comment" className="block text-sm font-medium text-foreground mb-1.5">Comment (optional)</label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
                maxLength={MAX_COMMENT}
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                data-testid="input-review-comment"
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{comment.length}/{MAX_COMMENT}</p>
            </div>
            <button
              type="submit"
              disabled={rating < 1}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
              data-testid="button-review-submit"
            >
              Continue
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
