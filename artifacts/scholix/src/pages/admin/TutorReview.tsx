import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, GraduationCap, FileText, Download, CheckCircle, XCircle, MessageSquare, Clock, Shield, BookOpen } from "lucide-react";

function getToken() { return localStorage.getItem("scholix_token") ?? ""; }

interface TutorWithDocs {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  subjects?: string[];
  hourlyRate: number;
  verificationStatus: string;
  isApproved: boolean;
  wwccNumber?: string;
  wwccExpiry?: string;
  educationDetails?: string;
  abn?: string;
  documents?: { id: number; docType: string; uploadedAt: string; originalName?: string }[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending_verification: { label: "Pending Review", cls: "bg-amber-100 text-amber-700" },
    verified: { label: "Approved", cls: "bg-green-100 text-green-700" },
    rejected: { label: "Rejected", cls: "bg-red-100 text-red-700" },
    info_requested: { label: "Info Requested", cls: "bg-blue-100 text-blue-700" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

export default function TutorReview() {
  const { id } = useParams<{ id: string }>();
  const [tutor, setTutor] = useState<TutorWithDocs | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [infoNotes, setInfoNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/tutors/all", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data: TutorWithDocs[]) => {
        const found = data.find((t) => t.id === parseInt(id, 10));
        setTutor(found ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const performAction = async (action: "approve" | "reject" | "request_info", notes?: string) => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/tutors/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ action, notes }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Action failed. Please try again.");
        return;
      }
      setDone(true);
      setShowRejectModal(false);
      setShowInfoModal(false);
      // Refresh tutor data
      const refreshed = await fetch("/api/admin/tutors/all", {
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((r) => r.json()).catch(() => []);
      const found = refreshed.find((t: TutorWithDocs) => t.id === parseInt(id, 10));
      if (found) setTutor(found);
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <p className="text-muted-foreground">Tutor not found.</p>
        <Link href="/admin/tutors" className="text-primary text-sm font-medium mt-3 inline-block hover:underline">
          ← Back to all tutors
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <Link href="/admin/tutors" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={15} />
          All tutors
        </Link>
      </div>

      {/* Header */}
      <div className="bg-card border border-card-border rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <GraduationCap size={24} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h1 className="text-lg font-bold text-foreground">{tutor.firstName} {tutor.lastName}</h1>
              <StatusBadge status={tutor.verificationStatus} />
            </div>
            <p className="text-sm text-muted-foreground">{tutor.email}</p>
            {tutor.phone && <p className="text-sm text-muted-foreground mt-0.5">{tutor.phone}</p>}
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="text-xs text-muted-foreground">${tutor.hourlyRate}/hr</span>
              {tutor.abn && <span className="text-xs text-muted-foreground">ABN: {tutor.abn}</span>}
            </div>
          </div>
        </div>
      </div>

      {done && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-4 flex items-center gap-2">
          <CheckCircle size={15} className="text-accent" />
          <p className="text-sm font-medium text-accent">Action completed — tutor has been notified.</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Profile details */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profile</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {tutor.bio ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Bio</p>
              <p className="text-sm text-foreground leading-relaxed">{tutor.bio}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No bio provided</p>
          )}
          {tutor.subjects && tutor.subjects.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Subjects</p>
              <div className="flex flex-wrap gap-1.5">
                {tutor.subjects.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WWCC */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Working With Children Check</p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-2">
          {tutor.wwccNumber ? (
            <>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Card number</span>
                <span className="text-xs font-semibold text-foreground">{tutor.wwccNumber}</span>
              </div>
              {tutor.wwccExpiry && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Expiry</span>
                  <span className="text-xs font-semibold text-foreground">{tutor.wwccExpiry}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">No WWCC number provided</p>
          )}
        </div>
      </div>

      {/* Education */}
      {tutor.educationDetails && (
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Education</p>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-foreground leading-relaxed">{tutor.educationDetails}</p>
          </div>
        </div>
      )}

      {/* Documents */}
      {tutor.documents && tutor.documents.length > 0 && (
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uploaded Documents</p>
          </div>
          <div className="divide-y divide-border">
            {tutor.documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 px-5 py-3">
                <FileText size={15} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground capitalize">{doc.docType.replace("_", " ")} document</p>
                  {doc.originalName && (
                    <p className="text-xs text-muted-foreground truncate">{doc.originalName}</p>
                  )}
                </div>
                <a
                  href={`/api/admin/documents/${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Download size={12} /> View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="bg-card border border-card-border rounded-2xl p-5 space-y-3">
        <p className="text-sm font-semibold text-foreground">Actions</p>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => performAction("approve")}
            disabled={actionLoading || tutor.verificationStatus === "verified"}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <CheckCircle size={16} />
            {tutor.verificationStatus === "verified" ? "Already Approved" : "Approve Tutor"}
          </button>
          <button
            onClick={() => setShowInfoModal(true)}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-semibold text-sm hover:bg-amber-100 disabled:opacity-50 transition-all"
          >
            <MessageSquare size={16} />
            Request More Information
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={actionLoading || tutor.verificationStatus === "rejected"}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-semibold text-sm hover:bg-destructive/20 disabled:opacity-50 transition-all"
          >
            <XCircle size={16} />
            Reject Application
          </button>
        </div>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-background rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2">
              <XCircle size={18} className="text-destructive" />
              <h2 className="text-base font-bold text-foreground">Reject Application</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejection. This will be sent to the tutor as a notification.
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="e.g. WWCC document is expired or illegible…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => performAction("reject", rejectNotes || undefined)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
              >
                {actionLoading ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request info modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-background rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-600" />
              <h2 className="text-base font-bold text-foreground">Request More Information</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Tell the tutor what additional information you need. They'll receive a notification with your message.
            </p>
            <textarea
              value={infoNotes}
              onChange={(e) => setInfoNotes(e.target.value)}
              placeholder="e.g. Please upload a clearer photo of your WWCC card…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowInfoModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => performAction("request_info", infoNotes || undefined)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
              >
                {actionLoading ? "Sending…" : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
