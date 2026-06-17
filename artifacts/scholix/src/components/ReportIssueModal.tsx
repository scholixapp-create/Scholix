import { useState } from "react";
import { Flag, X, AlertCircle, CheckCircle } from "lucide-react";

interface Props {
  onClose: () => void;
}

const CATEGORIES = [
  { value: "safety_concern", label: "Safety concern" },
  { value: "inappropriate_behaviour", label: "Inappropriate behaviour" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "tutoring_quality", label: "Tutoring quality" },
  { value: "other", label: "Other" },
] as const;

function getToken() {
  return localStorage.getItem("scholix_token") ?? "";
}

export default function ReportIssueModal({ onClose }: Props) {
  const [category, setCategory] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!category) { setError("Please select a category."); return; }
    if (message.trim().length < 10) { setError("Please provide at least 10 characters of detail."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ category, message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Submission failed. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-card border border-card-border rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Flag size={15} className="text-destructive" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Report an issue</h2>
              <p className="text-xs text-muted-foreground">Your report is reviewed by our safety team</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-5">
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={24} className="text-accent" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Report submitted</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                Thank you. Our safety team will review your report and take appropriate action within 1–2 business days.
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                >
                  <option value="">Select a category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Description
                  <span className="ml-1 text-muted-foreground font-normal text-xs">({message.length}/500)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  rows={4}
                  placeholder="Please describe the issue in detail. Include relevant dates, names, or session IDs if applicable."
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Confidential</strong> — Your report will only be seen by Scholix staff. For urgent safety concerns, contact emergency services directly.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-input text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg bg-destructive text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {loading ? "Submitting…" : "Submit report"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
