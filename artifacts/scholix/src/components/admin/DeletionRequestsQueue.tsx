import { useMemo, useState } from "react";
import {
  getListDeletionRequestsQueryKey,
  useListDeletionRequests,
  useReviewDeletionRequest,
  type AccountDeletionRequest,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { AlertCircle, CheckCircle, Inbox } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Decision = "approve" | "reject";
type Target = Readonly<{ id: number; email: string; role: string; name: string; decision: Decision }>;

function errorMessage(error: unknown, fallback: string) {
  const e = error as { data?: { error?: unknown; message?: unknown }; message?: string };
  if (typeof e?.data?.error === "string") return e.data.error;
  if (typeof e?.data?.message === "string") return e.data.message;
  return e?.message || fallback;
}

const statusCls: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-muted text-muted-foreground",
};

export default function DeletionRequestsQueue({ onReviewed }: { onReviewed?: (userId: number) => Promise<unknown> | void }) {
  const queryClient = useQueryClient();
  const requests = useListDeletionRequests({ query: { refetchInterval: 30_000, queryKey: getListDeletionRequestsQueryKey() } });
  const [target, setTarget] = useState<Target | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showReviewed, setShowReviewed] = useState(false);

  const review = useReviewDeletionRequest();

  const sorted = useMemo(() => {
    const list = [...(requests.data ?? [])];
    list.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return b.requestedAt.localeCompare(a.requestedAt);
    });
    return list;
  }, [requests.data]);
  const pending = sorted.filter((r) => r.status === "pending");
  const reviewed = sorted.filter((r) => r.status !== "pending");

  const open = (r: AccountDeletionRequest, decision: Decision) => {
    setTarget(Object.freeze({ id: r.id, email: r.email, role: r.role, name: `${r.firstName} ${r.lastName}`.trim(), decision }));
    setConfirmEmail("");
    setNotes("");
    setError("");
    setSuccess("");
  };

  const submit = () => {
    if (!target) return;
    const t = target;
    review.mutate(
      { requestId: t.id, data: { decision: t.decision, confirmationEmail: confirmEmail.trim(), notes: notes.trim() || undefined } },
      {
        onSuccess: async (result) => {
          setTarget(null);
          setSuccess(result.message);
          const userId = sorted.find((r) => r.id === t.id)?.userId;
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: getListDeletionRequestsQueryKey() }),
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
            userId ? onReviewed?.(userId) : undefined,
          ]);
        },
        onError: (e) => setError(errorMessage(e, "Could not review this request. Please try again.")),
      },
    );
  };

  const emailMatches = !!target && confirmEmail.trim().toLowerCase() === target.email.toLowerCase();

  const renderRow = (r: AccountDeletionRequest) => (
    <li key={r.id} className="rounded-lg border border-card-border bg-background p-3" data-testid={`row-deletion-request-${r.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{r.firstName} {r.lastName}</p>
          <p className="text-xs text-muted-foreground break-all">{r.email} · <span className="capitalize">{r.role}</span></p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Requested {format(parseISO(r.requestedAt), "MMM d, yyyy, h:mm a")}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${statusCls[r.status] ?? statusCls.rejected}`} data-testid={`status-deletion-request-${r.id}`}>
          {r.status}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Reason: </span>{r.reason || "None given"}</p>
      {r.status !== "pending" && (
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Outcome: </span>
          {r.status === "approved" ? "Approved, account deactivated and archived" : "Rejected, account unchanged"}
          {r.reviewedAt ? ` on ${format(parseISO(r.reviewedAt), "MMM d, yyyy")}` : ""}
          {r.reviewNotes ? `. Notes: ${r.reviewNotes}` : ""}
        </p>
      )}
      {r.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => open(r, "reject")} className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted" data-testid={`button-reject-deletion-${r.id}`}>
            Reject
          </button>
          <button type="button" onClick={() => open(r, "approve")} className="flex-1 rounded-lg border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/5" data-testid={`button-approve-deletion-${r.id}`}>
            Approve removal
          </button>
        </div>
      )}
    </li>
  );

  return (
    <section className="mb-6 rounded-xl border border-card-border bg-card p-4" aria-labelledby="deletion-queue-heading">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 id="deletion-queue-heading" className="text-sm font-semibold text-foreground">Account removal requests</h2>
          <p className="text-xs text-muted-foreground">Approval deactivates and archives the account and linked children. Financial, audit and compliance records are kept.</p>
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold" data-testid="text-pending-deletion-count">
          {pending.length} pending
        </span>
      </div>

      {success && (
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800" role="status">
          <CheckCircle size={14} className="mt-0.5 shrink-0" /> {success}
        </p>
      )}

      {requests.isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : requests.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-center justify-between gap-2">
          Removal requests could not be loaded.
          <button type="button" onClick={() => requests.refetch()} className="font-semibold underline">Retry</button>
        </div>
      ) : (
        <>
          {pending.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              <Inbox size={14} /> No pending removal requests.
            </div>
          ) : (
            <ul className="space-y-2">{pending.map(renderRow)}</ul>
          )}
          {reviewed.length > 0 && (
            <div className="mt-3">
              <button type="button" onClick={() => setShowReviewed((v) => !v)} className="text-xs font-medium text-primary hover:underline" data-testid="button-toggle-reviewed-requests">
                {showReviewed ? "Hide" : "Show"} reviewed requests ({reviewed.length})
              </button>
              {showReviewed && <ul className="mt-2 space-y-2">{reviewed.map(renderRow)}</ul>}
            </div>
          )}
        </>
      )}

      <AlertDialog open={target !== null} onOpenChange={(o) => { if (!o && !review.isPending) setTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{target?.decision === "approve" ? "Approve account removal?" : "Reject removal request?"}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Confirm the account by email and role:</p>
                <p className="font-semibold text-foreground break-all">{target?.name} · {target?.email} · <span className="capitalize">{target?.role}</span></p>
                {target?.decision === "approve" ? (
                  <p>The account and any linked student profiles will be deactivated and archived. Sign-in stops. Lesson, payment, invoice, dispute, audit and compliance history is kept in restricted form. Admin accounts, your own account and accounts with unresolved upcoming lessons cannot be approved.</p>
                ) : (
                  <p>The account stays active and unchanged. The requester keeps their existing access.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <label className="block">
              <span className="block text-xs font-medium text-foreground mb-1">Type the account email to confirm</span>
              <input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} autoComplete="off" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" data-testid="input-confirm-deletion-email" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-foreground mb-1">Review notes (optional)</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" data-testid="input-deletion-review-notes" />
            </label>
            {error && (
              <p className="flex items-start gap-2 text-sm text-destructive" role="alert"><AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={review.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!emailMatches || review.isPending}
              onClick={(e) => { e.preventDefault(); submit(); }}
              className={target?.decision === "approve" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              data-testid="button-confirm-deletion-review"
            >
              {review.isPending ? "Saving..." : target?.decision === "approve" ? "Approve removal" : "Reject request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
