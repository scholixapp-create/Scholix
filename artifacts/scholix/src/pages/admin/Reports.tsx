import { useState, useEffect } from "react";
import { Flag, CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";

interface Report {
  id: number;
  category: string;
  message: string;
  status: "open" | "resolved";
  createdAt: string;
  sessionId: number | null;
  reporter: { firstName: string; lastName: string; email: string } | null;
  reportedUser: { firstName: string; lastName: string; email: string } | null;
}

function getToken() {
  return localStorage.getItem("scholix_token") ?? "";
}

const CATEGORY_LABELS: Record<string, string> = {
  safety_concern: "Safety Concern",
  inappropriate_behaviour: "Inappropriate Behaviour",
  payment_issue: "Payment Issue",
  tutoring_quality: "Tutoring Quality",
  other: "Other",
};

const CATEGORY_COLOURS: Record<string, string> = {
  safety_concern: "bg-red-100 text-red-700",
  inappropriate_behaviour: "bg-orange-100 text-orange-700",
  payment_issue: "bg-yellow-100 text-yellow-700",
  tutoring_quality: "bg-blue-100 text-blue-700",
  other: "bg-muted text-muted-foreground",
};

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [resolving, setResolving] = useState<number | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reports", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to load reports");
      const data: Report[] = await res.json();
      setReports(data);
    } catch {
      setError("Failed to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleResolve = async (reportId: number) => {
    setResolving(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: "resolved" } : r));
      }
    } finally {
      setResolving(null);
    }
  };

  const filtered = reports.filter((r) => filter === "all" ? true : r.status === filter);
  const openCount = reports.filter((r) => r.status === "open").length;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Flag size={18} className="text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Safety Reports</h1>
            <p className="text-sm text-muted-foreground">
              {openCount > 0 ? (
                <span className="text-amber-600 font-medium">{openCount} open report{openCount !== 1 ? "s" : ""} need review</span>
              ) : (
                "All reports resolved"
              )}
            </p>
          </div>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-input text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit mb-5">
        {(["all", "open", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === f
                ? "bg-card shadow-sm text-foreground border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
            {f === "open" && openCount > 0 && (
              <span className="ml-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-destructive text-white text-[10px] font-bold">
                {openCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle size={36} className="text-accent mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">
            {filter === "open" ? "No open reports" : filter === "resolved" ? "No resolved reports yet" : "No reports submitted yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <div
              key={report.id}
              className={`bg-card border rounded-xl p-4 transition-opacity ${
                report.status === "resolved" ? "border-border opacity-60" : "border-card-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLOURS[report.category] ?? "bg-muted text-muted-foreground"}`}>
                    {CATEGORY_LABELS[report.category] ?? report.category}
                  </span>
                  {report.status === "open" ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                      <Clock size={10} />
                      Open
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent flex items-center gap-1">
                      <CheckCircle size={10} />
                      Resolved
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    #{report.id} · {new Date(report.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {report.status === "open" && (
                  <button
                    onClick={() => handleResolve(report.id)}
                    disabled={resolving === report.id}
                    className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center gap-1.5"
                  >
                    <CheckCircle size={12} />
                    {resolving === report.id ? "Resolving…" : "Mark resolved"}
                  </button>
                )}
              </div>

              <p className="text-sm text-foreground mt-3 leading-relaxed">{report.message}</p>

              <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                <span>
                  <strong className="text-foreground">Reporter: </strong>
                  {report.reporter
                    ? `${report.reporter.firstName} ${report.reporter.lastName} (${report.reporter.email})`
                    : "Unknown"}
                </span>
                {report.reportedUser && (
                  <span>
                    <strong className="text-foreground">Reported: </strong>
                    {`${report.reportedUser.firstName} ${report.reportedUser.lastName} (${report.reportedUser.email})`}
                  </span>
                )}
                {report.sessionId && (
                  <span><strong className="text-foreground">Session: </strong>#{report.sessionId}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
