import { useEffect, useState } from "react";
import { Link } from "wouter";
import { GraduationCap, CheckCircle, XCircle, Clock, FileText, Download, Eye, Shield, AlertTriangle, ChevronDown } from "lucide-react";

interface TutorWithDocs {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  bio: string | null;
  subjects: string[];
  hourlyRate: number;
  isApproved: boolean;
  verificationStatus: string;
  wwccNumber: string | null;
  wwccExpiry: string | null;
  educationDetails: string | null;
  abn: string | null;
  // Audit trail
  wwccVerifiedByName: string | null;
  wwccVerifiedAt: string | null;
  wwccVerificationMethod: string | null;
  wwccVerificationNotes: string | null;
  createdAt: string;
  documents: { id: number; docType: string; originalName: string; uploadedAt: string }[];
}

type StatusFilter = "all" | "pending" | "verified" | "rejected" | "expired";

function getToken() {
  return localStorage.getItem("scholix_token") ?? "";
}

function normaliseStatus(status: string): string {
  // Handle legacy status values from older DB records
  if (status === "pending_verification") return "pending";
  if (status === "approved") return "verified";
  return status;
}

function StatusBadge({ status }: { status: string }) {
  const s = normaliseStatus(status);
  if (s === "verified") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-semibold">
      <CheckCircle size={11} /> Verified
    </span>
  );
  if (s === "rejected") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[11px] font-semibold">
      <XCircle size={11} /> Rejected
    </span>
  );
  if (s === "expired") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-semibold">
      <AlertTriangle size={11} /> Expired
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">
      <Clock size={11} /> Pending
    </span>
  );
}

function WwccExpiryBadge({ expiry }: { expiry: string | null }) {
  if (!expiry) return null;
  const expiryDate = new Date(expiry);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return (
    <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
      Expired {Math.abs(daysLeft)}d ago
    </span>
  );
  if (daysLeft <= 90) return (
    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
      Expires in {daysLeft}d
    </span>
  );
  return (
    <span className="text-[10px] font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
      Valid {daysLeft}d left
    </span>
  );
}

export default function AdminTutorApprovals() {
  const [tutors, setTutors] = useState<TutorWithDocs[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [showNotes, setShowNotes] = useState<Record<number, boolean>>({});

  const fetchTutors = () => {
    setLoading(true);
    fetch("/api/admin/tutors/all", { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.json())
      .then((data) => setTutors(data))
      .catch(() => setTutors([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTutors(); }, []);

  const handleVerify = async (tutorId: number, action: "approve" | "reject") => {
    setActing(tutorId);
    try {
      await fetch(`/api/admin/tutors/${tutorId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ action, notes: notes[tutorId] ?? undefined }),
      });
      setNotes((prev) => { const n = { ...prev }; delete n[tutorId]; return n; });
      fetchTutors();
    } finally {
      setActing(null);
    }
  };

  const FILTER_TABS: StatusFilter[] = ["all", "pending", "verified", "rejected", "expired"];

  const filtered = tutors.filter((t) => {
    if (filter === "all") return true;
    return normaliseStatus(t.verificationStatus) === filter;
  });

  const pendingCount = tutors.filter((t) => normaliseStatus(t.verificationStatus) === "pending").length;
  const expiredCount = tutors.filter((t) => normaliseStatus(t.verificationStatus) === "expired").length;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-foreground">Tutor Verification</h1>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
              {pendingCount} pending
            </span>
          )}
          {expiredCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
              {expiredCount} expired
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">Review WWCC and education documents</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-muted rounded-xl overflow-x-auto">
        {FILTER_TABS.map((f) => {
          const count = f === "all" ? tutors.length : tutors.filter((t) => normaliseStatus(t.verificationStatus) === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 py-1.5 px-3 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === f ? "bg-card shadow-xs text-foreground" : "text-muted-foreground"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1 text-[10px] opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <GraduationCap size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tutors in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tutor) => {
            const isExpanded = expanded === tutor.id;
            const normStatus = normaliseStatus(tutor.verificationStatus);
            return (
              <div key={tutor.id} className={`bg-card border rounded-xl overflow-hidden ${
                normStatus === "expired" ? "border-red-200" : "border-card-border"
              }`}>
                {/* Summary row */}
                <div className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/admin/tutors/${tutor.id}/review`}
                        className="text-sm font-bold text-foreground hover:text-primary hover:underline transition-colors"
                      >
                        {tutor.firstName} {tutor.lastName}
                      </Link>
                      <StatusBadge status={tutor.verificationStatus} />
                    </div>
                    <p className="text-xs text-muted-foreground">{tutor.email}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">${tutor.hourlyRate}/hr</span>
                      {tutor.subjects.length > 0 && (
                        <span className="text-xs text-muted-foreground truncate">{tutor.subjects.join(", ")}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : tutor.id)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <Eye size={15} />
                  </button>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/30">
                    {/* WWCC info */}
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <Shield size={12} className="text-primary" />
                        Working With Children Check
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-0.5">WWCC Number</p>
                          <p className="font-medium text-foreground font-mono">{tutor.wwccNumber ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">Expiry</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-foreground">{tutor.wwccExpiry ?? "—"}</p>
                            {tutor.wwccExpiry && <WwccExpiryBadge expiry={tutor.wwccExpiry} />}
                          </div>
                        </div>
                        {tutor.abn && (
                          <div>
                            <p className="text-muted-foreground mb-0.5">ABN</p>
                            <p className="font-medium text-foreground font-mono">{tutor.abn}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Education */}
                    {tutor.educationDetails && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                          <FileText size={12} className="text-accent" />
                          Education Details
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{tutor.educationDetails}</p>
                      </div>
                    )}

                    {/* Audit trail */}
                    {tutor.wwccVerifiedAt && (
                      <div className="bg-card border border-border rounded-lg px-3 py-2.5 text-xs">
                        <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                          <CheckCircle size={11} className="text-accent" />
                          Verification record
                        </p>
                        <div className="text-muted-foreground space-y-0.5">
                          <p>By: <span className="text-foreground font-medium">{tutor.wwccVerifiedByName ?? "Unknown admin"}</span></p>
                          <p>At: <span className="text-foreground font-medium">{new Date(tutor.wwccVerifiedAt).toLocaleString("en-AU")}</span></p>
                          {tutor.wwccVerificationMethod && (
                            <p>Method: <span className="text-foreground font-medium capitalize">{tutor.wwccVerificationMethod.replace(/_/g, " ")}</span></p>
                          )}
                          {tutor.wwccVerificationNotes && (
                            <p className="mt-1.5 pt-1.5 border-t border-border">
                              Notes: <span className="text-foreground">{tutor.wwccVerificationNotes}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Documents */}
                    {tutor.documents.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">Uploaded Documents</p>
                        <div className="space-y-1.5">
                          {tutor.documents.map((doc) => (
                            <a
                              key={doc.id}
                              href={`/api/admin/documents/${doc.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors"
                            >
                              <FileText size={13} className="text-primary shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{doc.originalName}</p>
                                <p className="text-[10px] text-muted-foreground capitalize">{doc.docType} document</p>
                              </div>
                              <Download size={12} className="text-muted-foreground shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes for new verification actions */}
                    {normStatus !== "verified" && (
                      <div>
                        <button
                          onClick={() => setShowNotes((prev) => ({ ...prev, [tutor.id]: !prev[tutor.id] }))}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1.5"
                        >
                          <ChevronDown size={12} className={`transition-transform ${showNotes[tutor.id] ? "rotate-180" : ""}`} />
                          Add verification notes (optional)
                        </button>
                        {showNotes[tutor.id] && (
                          <textarea
                            value={notes[tutor.id] ?? ""}
                            onChange={(e) => setNotes((prev) => ({ ...prev, [tutor.id]: e.target.value }))}
                            placeholder="e.g. WWCC verified against Service Victoria portal. All documents sighted."
                            rows={3}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {normStatus !== "verified" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleVerify(tutor.id, "approve")}
                          disabled={acting === tutor.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                        >
                          <CheckCircle size={13} />
                          Approve
                        </button>
                        {normStatus !== "rejected" && (
                          <button
                            onClick={() => handleVerify(tutor.id, "reject")}
                            disabled={acting === tutor.id}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-destructive/40 text-destructive text-xs font-semibold hover:bg-destructive/5 disabled:opacity-60 transition-colors"
                          >
                            <XCircle size={13} />
                            Reject
                          </button>
                        )}
                      </div>
                    )}
                    {normStatus === "verified" && (
                      <button
                        onClick={() => handleVerify(tutor.id, "reject")}
                        disabled={acting === tutor.id}
                        className="w-full py-2 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:border-destructive/40 hover:text-destructive transition-colors"
                      >
                        Revoke approval
                      </button>
                    )}
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
