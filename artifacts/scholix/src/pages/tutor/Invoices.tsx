import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { FileText, Download, Receipt, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";

interface TutorInvoice {
  id: number;
  invoiceNumber: string;
  sessionId: number;
  totalAmount: number;
  platformCommission: number;
  tutorEarnings: number;
  commissionRate: number;
  commissionTier: string;
  generatedAt: string;
  studentName: string;
  subject: string;
  scheduledAt: string;
  durationMinutes: number;
}

function getToken() {
  return localStorage.getItem("scholix_token") ?? "";
}

const TIER_LABEL: Record<string, string> = {
  first_student_free: "First student — free",
  first_session_free: "First session — free",
  standard: "Starter (30%)",
  growth: "Growth (25%)",
  established: "Established (20%)",
  expert: "Expert (15%)",
};

export default function TutorInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<TutorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/invoices?tutorId=${user.id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data) => setInvoices(Array.isArray(data) ? data : []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleDownload = async (invoiceId: number) => {
    setDownloading(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scholix-invoice-${invoiceId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not download PDF. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const totalEarnings = invoices.reduce((sum, inv) => sum + (inv.tutorEarnings ?? inv.totalAmount), 0);
  const totalSessions = invoices.length;

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-foreground">Invoices</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {totalSessions} invoice{totalSessions !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Summary card */}
      {!loading && invoices.length > 0 && (
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total earnings</p>
            <p className="text-2xl font-bold text-foreground">${totalEarnings.toFixed(2)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-10 text-center">
          <Receipt size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No invoices yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Invoices are generated automatically when a session is paid
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const earnings = inv.tutorEarnings ?? inv.totalAmount;
            const commission = inv.platformCommission ?? 0;
            const rate = inv.commissionRate ?? 0;
            const isFree = rate === 0;

            return (
              <div key={inv.id} className="bg-card border border-card-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{inv.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{inv.studentName}</p>
                      {inv.scheduledAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(inv.scheduledAt), "EEE, MMM d 'at' h:mm a")} · {inv.durationMinutes}min
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-foreground">${earnings.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      #{inv.invoiceNumber ?? String(inv.id).padStart(5, "0")}
                    </p>
                  </div>
                </div>

                {/* Earnings breakdown */}
                <div className="bg-muted/40 rounded-lg px-3 py-2 mb-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Session total</span>
                    <span className="text-foreground font-medium">${inv.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Platform fee
                      {isFree
                        ? " (0% — " + (TIER_LABEL[inv.commissionTier] ?? inv.commissionTier) + ")"
                        : ` (${(rate * 100).toFixed(0)}%)`}
                    </span>
                    <span className="text-muted-foreground">−${commission.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-border pt-1 mt-1">
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Your earnings</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">${earnings.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    Issued {format(parseISO(inv.generatedAt), "d MMM yyyy")}
                  </p>
                  <button
                    onClick={() => handleDownload(inv.id)}
                    disabled={downloading === inv.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 disabled:opacity-50 transition-colors"
                  >
                    <Download size={12} />
                    {downloading === inv.id ? "…" : "PDF"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
