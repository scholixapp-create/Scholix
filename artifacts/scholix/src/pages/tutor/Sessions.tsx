import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useListTutors, useListSessions, useCompleteSession, useCancelSession } from "@workspace/api-client-react";
import { getListSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import StatusBadge from "@/components/StatusBadge";
import { Calendar, CheckCircle, X, Download, FileText, Sparkles, TrendingUp, Star, ClipboardList } from "lucide-react";
import { format, parseISO } from "date-fns";

function getToken() { return localStorage.getItem("scholix_token") ?? ""; }

interface InvoiceData {
  id: number;
  sessionId: number;
  totalAmount: number;
  platformCommission: number;
  tutorEarnings: number;
  commissionRate: number;
  commissionTier?: string;
  isCommissionFree?: boolean;
  generatedAt: string;
  tutorName: string;
  studentName: string;
  subject: string;
  durationMinutes: number;
}

function tierLabel(tier?: string) {
  switch (tier) {
    case "first_student_free": return "First student — always free";
    case "first_session_free": return "First session with this student — free!";
    case "growth": return "Growth tier (10+ sessions)";
    case "established": return "Established tier (25+ sessions)";
    case "expert": return "Expert tier (50+ sessions)";
    default: return "Standard rate";
  }
}

function InvoiceModal({ invoice, onClose, onLogProgress }: {
  invoice: InvoiceData;
  onClose: () => void;
  onLogProgress: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const isFree = invoice.isCommissionFree;
  const commPct = Math.round((invoice.commissionRate ?? 0.3) * 100);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scholix-invoice-${invoice.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const generatedDate = format(parseISO(invoice.generatedAt), "d MMMM yyyy");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-sidebar px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <FileText size={15} className="text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Invoice Generated</p>
                <p className="text-white/50 text-[11px]">#{String(invoice.id).padStart(5, "0")} · {generatedDate}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X size={16} className="text-white/70" />
            </button>
          </div>
        </div>

        {/* Free session banner */}
        {isFree && (
          <div className="px-5 py-2.5 bg-accent/10 border-b border-accent/20 flex items-center gap-2">
            <Sparkles size={13} className="text-accent shrink-0" />
            <p className="text-[12px] font-semibold text-accent leading-tight">
              First session: No platform fee — you keep 100%
            </p>
          </div>
        )}

        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={14} className="text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-wide">Session Complete</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subject</span>
              <span className="font-semibold text-foreground">{invoice.subject}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Student</span>
              <span className="font-medium text-foreground">{invoice.studentName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium text-foreground">{invoice.durationMinutes} min</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tutor</span>
              <span className="font-medium text-foreground">{invoice.tutorName}</span>
            </div>
          </div>
        </div>

        {/* Earnings breakdown */}
        <div className="px-5 py-4 bg-muted/40 border-b border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total charged</span>
            <span className="font-semibold text-foreground">${invoice.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Platform fee
              {isFree ? " (0% — free session)" : ` (${commPct}%)`}
            </span>
            <span className={`font-semibold ${isFree ? "text-accent" : "text-destructive"}`}>
              {isFree ? "FREE" : `−$${invoice.platformCommission.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t border-border pt-2">
            <span className="font-semibold text-foreground">You receive</span>
            <span className="text-xl font-bold text-accent">${invoice.tutorEarnings.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{tierLabel(invoice.commissionTier)}</p>
        </div>

        <div className="px-5 py-4 flex gap-2.5">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            <Download size={14} />
            {downloading ? "Generating…" : "Download PDF"}
          </button>
          <button
            onClick={onLogProgress}
            className="py-2.5 px-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <ClipboardList size={14} />
            Log
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressModal({ sessionId, studentName, onClose }: {
  sessionId: number;
  studentName: string;
  onClose: () => void;
}) {
  const [score, setScore] = useState(7);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/sessions/${sessionId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ score, notes }),
      });
      setSaved(true);
      setTimeout(onClose, 1200);
    } catch {
      alert("Could not save progress. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const scoreEmoji = score <= 3 ? "🔴" : score <= 5 ? "🟡" : score <= 7 ? "🟢" : "⭐";
  const scoreLabel = score <= 3 ? "Needs support" : score <= 5 ? "Developing" : score <= 7 ? "On track" : "Excelling";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Log Progress</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              How did <span className="font-medium text-foreground">{studentName}</span> do?
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {saved ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle size={32} className="text-accent" />
              <p className="text-sm font-semibold text-foreground">Progress saved!</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-foreground mb-3">
                  Progress score — <span className="text-primary">{score}/10</span> {scoreEmoji} <span className="text-muted-foreground font-normal">{scoreLabel}</span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">1</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={score}
                    onChange={(e) => setScore(parseInt(e.target.value))}
                    className="flex-1 h-2 rounded-full accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">10</span>
                </div>
                <div className="flex justify-between mt-1.5">
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setScore(n)}
                      className={`w-6 h-6 rounded-full text-[10px] font-bold transition-all ${
                        score === n ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-primary/20"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Notes <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Topics covered, areas to improve, homework set..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-1.5"
                >
                  <Star size={13} />
                  {saving ? "Saving…" : "Save Progress"}
                </button>
              </div>
            </>
          )}
        </div>
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
    query: { enabled: !!tutorId } as any,
  });
  const completeMutation = useCompleteSession();
  const cancelMutation = useCancelSession();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [progressSession, setProgressSession] = useState<{ id: number; studentName: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "scheduled" | "completed">("all");

  const filtered = sessions.data
    ?.filter((s) => filter === "all" || s.status === filter)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()) ?? [];

  const handleComplete = (sessionId: number) => {
    completeMutation.mutate({ sessionId }, {
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        const inv = data.invoice as InvoiceData;
        setInvoice(inv);
      },
    });
  };

  const handleCancel = (sessionId: number) => {
    if (!confirm("Cancel this session?")) return;
    cancelMutation.mutate({ sessionId }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListSessionsQueryKey() }),
    });
  };

  const handleLogProgress = () => {
    if (!invoice) return;
    const s = sessions.data?.find((s) => s.id === invoice.sessionId);
    setProgressSession({ id: invoice.sessionId, studentName: invoice.studentName });
    setInvoice(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      {invoice && (
        <InvoiceModal
          invoice={invoice}
          onClose={() => setInvoice(null)}
          onLogProgress={handleLogProgress}
        />
      )}
      {progressSession && (
        <ProgressModal
          sessionId={progressSession.id}
          studentName={progressSession.studentName}
          onClose={() => setProgressSession(null)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">My Sessions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{sessions.data?.length ?? 0} total sessions</p>
      </div>

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
          {filtered.map((session) => {
            const isFree = (session as any).isCommissionFree;
            return (
              <div key={session.id} className="bg-card border border-card-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{session.subject}</p>
                      {isFree && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold">
                          <Sparkles size={9} /> No platform fee
                        </span>
                      )}
                    </div>
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
                      {completeMutation.isPending ? "Completing…" : "Mark Complete"}
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
                {session.status === "completed" && (
                  <div className="pt-2 border-t border-border">
                    <button
                      onClick={() => setProgressSession({ id: session.id, studentName: session.studentName ?? "Student" })}
                      className="w-full py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
                    >
                      <TrendingUp size={12} />
                      Log Progress
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
