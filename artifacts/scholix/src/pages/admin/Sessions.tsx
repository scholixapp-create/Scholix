import { useState } from "react";
import { useListSessions, useGetSession } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "@/components/StatusBadge";
import { Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tutorProfilePathFromDisplayName } from "@/lib/tutorProfileLink";

export default function AdminSessions() {
  const sessions = useListSessions(undefined);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const detail = useGetSession(selectedId ?? 0, { query: { enabled: selectedId !== null } });
  const [filter, setFilter] = useState<"all" | "scheduled" | "completed" | "cancelled">("all");

  const filtered = sessions.data
    ?.filter((s) => filter === "all" || s.status === filter)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()) ?? [];

  const totalRevenue = sessions.data
    ?.filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.totalAmount, 0) ?? 0;

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">All Sessions</h1>
        <div className="flex items-center gap-4 mt-0.5">
          <p className="text-sm text-muted-foreground">{sessions.data?.length ?? 0} total</p>
          <p className="text-sm text-accent font-medium">Revenue: ${totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-4 p-1 bg-muted rounded-xl overflow-x-auto">
        {(["all", "scheduled", "completed", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 py-1.5 px-3 rounded-lg text-xs font-medium capitalize transition-all ${
              filter === f ? "bg-card shadow-xs text-foreground" : "text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {sessions.isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <Calendar size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No sessions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((session) => (
            <button key={session.id} type="button" onClick={() => setSelectedId(session.id)}
              aria-label={`View session ${session.id}: ${session.subject}`}
              className="w-full text-left bg-card border border-card-border rounded-xl p-4 hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{session.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {session.tutorName} → {session.studentName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(session.scheduledAt), "EEE, MMM d 'at' h:mm a")} · {session.durationMinutes}min
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge status={session.status} />
                  <span className="text-xs font-semibold text-foreground">${session.totalAmount.toFixed(0)}</span>
                  {session.isPaid && <span className="text-[10px] text-accent font-medium">Paid</span>}
                </div>
              </div>
              <span className="mt-2 block text-xs text-primary">View session details →</span>
            </button>
          ))}
        </div>
      )}
      <Dialog open={selectedId !== null} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Session #{selectedId}</DialogTitle>
            <DialogDescription>Booking, participant and payment information.</DialogDescription>
          </DialogHeader>
          {detail.isLoading ? <p role="status">Loading session…</p> : detail.isError ? (
            <div role="alert">
              <p>Unable to load this session. Your session may have expired.</p>
              <button type="button" onClick={() => detail.refetch()} className="text-primary underline">Try again</button>
            </div>
          ) : detail.data && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-muted-foreground">Subject</dt><dd>{detail.data.subject}</dd>
              <dt className="text-muted-foreground">Tutor</dt><dd><Link className="text-primary underline" href={tutorProfilePathFromDisplayName(detail.data.tutorId, detail.data.tutorName)}>{detail.data.tutorName ?? `Tutor #${detail.data.tutorId}`}</Link></dd>
              <dt className="text-muted-foreground">Student</dt><dd>{detail.data.studentName ?? `Student #${detail.data.studentId}`}</dd>
              <dt className="text-muted-foreground">Scheduled</dt><dd>{format(parseISO(detail.data.scheduledAt), "PPpp")}</dd>
              <dt className="text-muted-foreground">Duration</dt><dd>{detail.data.durationMinutes} minutes</dd>
              <dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={detail.data.status} /></dd>
              <dt className="text-muted-foreground">Payment</dt><dd>{detail.data.isPaid ? "Paid" : "Not paid"}</dd>
              <dt className="text-muted-foreground">Booking amount</dt><dd>${detail.data.totalAmount.toFixed(2)}</dd>
              <dt className="text-muted-foreground">Created</dt><dd>{format(parseISO(detail.data.createdAt), "PPpp")}</dd>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
