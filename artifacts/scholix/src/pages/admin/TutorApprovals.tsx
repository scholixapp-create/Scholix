import { useEffect, useState } from "react";
import { GraduationCap, CheckCircle, XCircle, Clock, FileText, Download, Eye, Shield } from "lucide-react";

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
  createdAt: string;
  documents: { id: number; docType: string; originalName: string; uploadedAt: string }[];
}

type StatusFilter = "all" | "pending_verification" | "approved" | "rejected";

function getToken() {
  return localStorage.getItem("scholix_token") ?? "";
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-semibold">
      <CheckCircle size={11} /> Approved
    </span>
  );
  if (status === "rejected") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[11px] font-semibold">
      <XCircle size={11} /> Rejected
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">
      <Clock size={11} /> Pending
    </span>
  );
}

export default function AdminTutorApprovals() {
  const [tutors, setTutors] = useState<TutorWithDocs[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

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
        body: JSON.stringify({ action }),
      });
      fetchTutors();
    } finally {
      setActing(null);
    }
  };

  const filtered = tutors.filter((t) => filter === "all" || t.verificationStatus === filter);
  const pendingCount = tutors.filter((t) => t.verificationStatus === "pending_verification").length;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">Tutor Verification</h1>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
              {pendingCount} pending
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">Review WWCC and education documents</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-muted rounded-xl overflow-x-auto">
        {(["all", "pending_verification", "approved", "rejected"] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 py-1.5 px-3 rounded-lg text-xs font-medium capitalize transition-all ${
              filter === f ? "bg-card shadow-xs text-foreground" : "text-muted-foreground"
            }`}
          >
            {f === "pending_verification" ? "Pending" : f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1 text-[10px] opacity-60">
              ({f === "all" ? tutors.length : tutors.filter((t) => t.verificationStatus === f).length})
            </span>
          </button>
        ))}
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
            return (
              <div key={tutor.id} className="bg-card border border-card-border rounded-xl overflow-hidden">
                {/* Summary row */}
                <div className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground">{tutor.firstName} {tutor.lastName}</p>
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
                          <p className="font-medium text-foreground">{tutor.wwccNumber ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">Expiry</p>
                          <p className="font-medium text-foreground">{tutor.wwccExpiry ?? "—"}</p>
                        </div>
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

                    {/* Actions */}
                    {tutor.verificationStatus !== "approved" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleVerify(tutor.id, "approve")}
                          disabled={acting === tutor.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                        >
                          <CheckCircle size={13} />
                          Approve
                        </button>
                        {tutor.verificationStatus !== "rejected" && (
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
                    {tutor.verificationStatus === "approved" && (
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
