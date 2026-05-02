import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useListTutors, useListSessions, useCompleteSession, useCancelSession } from "@workspace/api-client-react";
import { getListSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import StatusBadge from "@/components/StatusBadge";
import { Calendar, CheckCircle, X } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Invoice {
  id: number;
  sessionId: number;
  totalAmount: number;
  platformCommission: number;
  tutorEarnings: number;
  commissionRate: number;
  generatedAt: string;
  tutorName: string;
  studentName: string;
  subject: string;
  durationMinutes: number;
}

function InvoiceCard({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-card border border-card-border rounded-2xl p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <CheckCircle size={16} className="text-accent" />
              <h2 className="text-base font-bold text-foreground">Session Complete</h2>
            </div>
            <p className="text-xs text-muted-foreground">Invoice #{invoice.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 mb-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subject</span>
            <span className="font-medium text-foreground">{invoice.subject}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Student</span>
            <span className="font-medium text-foreground">{invoice.studentName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium text-foreground">{invoice.durationMinutes} min</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total amount</span>
            <span className="font-medium text-foreground">${invoice.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Platform (30%)</span>
            <span className="font-medium text-destructive">-${invoice.platformCommission.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span className="font-semibold text-foreground">Your earnings (70%)</span>
            <span className="font-bold text-accent text-base">${invoice.tutorEarnings.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function TutorSessions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const tutors = useListTutors();
  const tutorProfile = tutors.data?.find((t) => t.userId === user?.id);
  const tutorId = tutorProfile?.id;

  const sessions = useListSessions(tutorId ? { tutorId } : undefined, {
    query: { enabled: !!tutorId },
  });
  const completeMutation = useCompleteSession();
  const cancelMutation = useCancelSession();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState<"all" | "scheduled" | "completed">("all");

  const filtered = sessions.data?.filter((s) => {
    if (filter === "all") return true;
    return s.status === filter;
  }).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()) ?? [];

  const handleComplete = (sessionId: number) => {
    completeMutation.mutate({ sessionId }, {
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        setInvoice(data.invoice as Invoice);
      },
    });
  };

  const handleCancel = (sessionId: number) => {
    if (!confirm("Cancel this session?")) return;
    cancelMutation.mutate({ sessionId }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListSessionsQueryKey() }),
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      {invoice && <InvoiceCard invoice={invoice} onClose={() => setInvoice(null)} />}

      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">My Sessions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{sessions.data?.length ?? 0} total sessions</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-muted rounded-xl">
        {(["all", "scheduled", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium capitalize transition-all ${
              filter === f ? "bg-card shadow-xs text-foreground" : "text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {sessions.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <Calendar size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No sessions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((session) => (
            <div key={session.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{session.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{session.studentName}</p>
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
              {session.status === "scheduled" && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => handleComplete(session.id)}
                    disabled={completeMutation.isPending}
                    className="flex-1 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle size={13} />
                    Mark Complete
                  </button>
                  <button
                    onClick={() => handleCancel(session.id)}
                    disabled={cancelMutation.isPending}
                    className="py-2 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
