import { useListTutorReviews } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { Star, RefreshCw, MessageSquare } from "lucide-react";

function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} aria-hidden="true" />
      ))}
    </span>
  );
}

function safeDate(value: string) {
  try { return format(parseISO(value), "d MMM yyyy"); } catch { return ""; }
}

export default function TutorReviewsSection({ tutorId }: { tutorId: number }) {
  const reviews = useListTutorReviews(tutorId);
  const list = reviews.data ?? [];
  const average = list.length ? list.reduce((sum, r) => sum + r.rating, 0) / list.length : 0;
  const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <section className="mb-6" aria-labelledby="tutor-reviews-heading" data-testid="section-tutor-reviews">
      <div className="flex items-center gap-2 mb-3">
        <Star size={16} className="text-amber-500" />
        <h2 id="tutor-reviews-heading" className="text-sm font-semibold text-foreground">Ratings & Reviews</h2>
      </div>

      {reviews.isLoading ? (
        <div className="space-y-2" aria-label="Loading reviews">
          <div className="h-16 rounded-xl bg-muted animate-pulse" />
          <div className="h-20 rounded-xl bg-muted animate-pulse" />
        </div>
      ) : reviews.isError ? (
        <div className="bg-card border border-card-border rounded-xl p-5 text-center">
          <p className="text-sm text-muted-foreground">We could not load your reviews.</p>
          <button type="button" onClick={() => reviews.refetch()} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted" data-testid="button-reviews-retry">
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-6 text-center" data-testid="status-reviews-empty">
          <MessageSquare size={22} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-foreground font-medium">No reviews yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Each family can leave one review after a completed session.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-4" data-testid="card-rating-summary">
            <p className="text-3xl font-bold text-foreground" data-testid="text-average-rating">{average.toFixed(1)}</p>
            <div>
              <Stars value={average} size={14} />
              <p className="text-xs text-muted-foreground mt-1">
                {list.length} {list.length === 1 ? "family review" : "family reviews"}
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {sorted.map((r) => (
              <li key={r.id} className="bg-card border border-card-border rounded-xl p-4" data-testid={`card-review-${r.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <Stars value={r.rating} />
                  <time dateTime={r.createdAt} className="text-[11px] text-muted-foreground">{safeDate(r.createdAt)}</time>
                </div>
                {r.comment ? (
                  <p className="text-sm text-foreground mt-2 leading-relaxed whitespace-pre-wrap break-words">{r.comment}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2 italic">Rating only, no comment.</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
