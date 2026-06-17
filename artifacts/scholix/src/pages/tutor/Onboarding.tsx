import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Shield, Upload, CheckCircle, Clock, FileText, AlertCircle, Sparkles, Trophy, Building2, ExternalLink, ClipboardCheck } from "lucide-react";

interface TutorMe {
  verificationStatus: string;
  wwccNumber?: string;
  wwccExpiry?: string;
  educationDetails?: string;
  abn?: string;
  documents?: { id: number; docType: string; originalName: string }[];
}

function getToken() {
  return localStorage.getItem("scholix_token") ?? "";
}

async function apiGet(path: string) {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPut(path: string, body: object) {
  const res = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost(path: string, body: object) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function uploadDoc(docType: string, file: File) {
  const form = new FormData();
  form.append("docType", docType);
  form.append("file", file);
  const res = await fetch("/api/tutors/me/documents", {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function FileDropZone({
  label, hint, accept, file, uploaded, onChange,
}: {
  label: string; hint: string; accept: string; file: File | null;
  uploaded?: boolean; onChange: (f: File) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <label
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors ${
          uploaded ? "border-accent/50 bg-accent/5" : file ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"
        }`}
      >
        <input type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
        {uploaded ? (
          <><CheckCircle size={22} className="text-accent" /><span className="text-xs font-medium text-accent">Uploaded</span></>
        ) : file ? (
          <><FileText size={22} className="text-primary" /><span className="text-xs font-medium text-foreground truncate max-w-full px-2">{file.name}</span></>
        ) : (
          <><Upload size={22} className="text-muted-foreground" /><span className="text-xs text-muted-foreground text-center">{hint}</span></>
        )}
      </label>
    </div>
  );
}

export default function TutorOnboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [tutorMe, setTutorMe] = useState<TutorMe | null>(null);
  const [step, setStep] = useState<"form" | "uploading" | "submitted">("form");
  const [error, setError] = useState("");

  const [wwccNumber, setWwccNumber] = useState("");
  const [wwccExpiry, setWwccExpiry] = useState("");
  const [educationDetails, setEducationDetails] = useState("");
  const [abn, setAbn] = useState("");
  const [wwccFile, setWwccFile] = useState<File | null>(null);
  const [educationFile, setEducationFile] = useState<File | null>(null);
  const [wwccUploaded, setWwccUploaded] = useState(false);
  const [educationUploaded, setEducationUploaded] = useState(false);

  // Compliance checkboxes
  const [wwccDeclared, setWwccDeclared] = useState(false);
  const [codeOfConductAccepted, setCodeOfConductAccepted] = useState(false);

  useEffect(() => {
    apiGet("/api/tutors/me").then((data: TutorMe) => {
      setTutorMe(data);
      if (data.verificationStatus === "approved") navigate("/tutor/dashboard");
      if (data.wwccNumber) setWwccNumber(data.wwccNumber);
      if (data.wwccExpiry) setWwccExpiry(data.wwccExpiry);
      if (data.educationDetails) setEducationDetails(data.educationDetails);
      if (data.abn) setAbn(data.abn);
      if (data.documents?.some((d) => d.docType === "wwcc")) setWwccUploaded(true);
      if (data.documents?.some((d) => d.docType === "education")) setEducationUploaded(true);
    }).catch(() => {});

    // Load existing compliance state
    apiGet("/api/tutors/me/compliance").then((data: { wwccDeclared: boolean; codeOfConductAccepted: boolean }) => {
      setWwccDeclared(data.wwccDeclared);
      setCodeOfConductAccepted(data.codeOfConductAccepted);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const abnClean = abn.replace(/\s/g, "");
    if (!abnClean) { setError("ABN is required. As a contractor, you must provide your Australian Business Number."); return; }
    if (!/^\d{11}$/.test(abnClean)) { setError("ABN must be exactly 11 digits. Remove any spaces or dashes."); return; }
    if (!wwccNumber.trim()) { setError("WWCC number is required."); return; }
    if (!wwccExpiry) { setError("WWCC expiry date is required."); return; }
    if (!wwccFile && !wwccUploaded) { setError("Please upload your WWCC document."); return; }
    if (!wwccDeclared) { setError("You must declare that your WWCC is valid and current."); return; }
    if (!codeOfConductAccepted) { setError("You must accept the Scholix Tutor Code of Conduct."); return; }

    setStep("uploading");

    try {
      await apiPut("/api/tutors/me/details", { wwccNumber, wwccExpiry, educationDetails, abn: abn.replace(/\s/g, "") });

      if (wwccFile && !wwccUploaded) {
        await uploadDoc("wwcc", wwccFile);
        setWwccUploaded(true);
      }
      if (educationFile && !educationUploaded) {
        await uploadDoc("education", educationFile);
        setEducationUploaded(true);
      }

      // Save compliance declarations
      await apiPost("/api/tutors/me/compliance", { wwccDeclared, codeOfConductAccepted });

      setStep("submitted");
    } catch (err) {
      setError("Submission failed. Please try again.");
      setStep("form");
    }
  };

  if (step === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <Clock size={28} className="text-accent" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Under Review</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Your verification documents have been submitted. Our team will review your application and approve your account within 1–2 business days.
          </p>
          <button
            onClick={() => navigate("/tutor/dashboard")}
            className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield size={22} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Verify your account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete verification to start accepting bookings
          </p>
        </div>

        {/* Commission perks promo */}
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 mb-6 space-y-3">
          <p className="text-xs font-bold text-accent uppercase tracking-wider">Tutor Benefits</p>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={13} className="text-accent" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">First Student — Always Free</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your very first student on Scholix pays <strong className="text-accent">0% platform commission</strong> on every lesson, forever.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={13} className="text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Every New Student — First Session Free</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  The first session with any new student is <strong className="text-primary">0% commission</strong> — helping you build your client base.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <Trophy size={13} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Commission Drops as You Grow</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Standard fee is 30%. Hit 10 sessions → <strong>25%</strong>. Hit 25 → <strong>20%</strong>. Hit 50 → <strong>15%</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ABN */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <Building2 size={14} className="text-primary" />
                Australian Business Number (ABN)
                <span className="ml-auto text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">Required</span>
              </h2>
              <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                As a contractor on Scholix you operate as a sole trader. Your ABN is required for tax and payment purposes under Australian law.
              </p>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">ABN</label>
                  <input
                    type="text"
                    value={abn}
                    onChange={(e) => setAbn(e.target.value.replace(/[^\d\s]/g, ""))}
                    placeholder="e.g. 51 824 753 556"
                    maxLength={14}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors font-mono tracking-wider"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">11 digits — spaces are fine</p>
                </div>
                <a
                  href="https://abr.business.gov.au/ABN/Default"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <ExternalLink size={11} />
                  Look up your ABN on the Australian Business Register
                </a>
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Don't have an ABN?</strong> You can apply for free at{" "}
                    <a href="https://abr.business.gov.au" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">abr.business.gov.au</a>.
                    Most applications are processed within minutes. You'll need your Tax File Number (TFN) handy.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* WWCC */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Shield size={14} className="text-primary" />
                Working With Children Check
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">WWCC Number</label>
                  <input
                    type="text"
                    value={wwccNumber}
                    onChange={(e) => setWwccNumber(e.target.value)}
                    placeholder="e.g. WWC0123456A"
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">WWCC Expiry Date</label>
                  <input
                    type="date"
                    value={wwccExpiry}
                    onChange={(e) => setWwccExpiry(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                </div>
                <FileDropZone
                  label="Upload WWCC document"
                  hint="PDF or image · Max 10MB"
                  accept=".pdf,.jpg,.jpeg,.png"
                  file={wwccFile}
                  uploaded={wwccUploaded}
                  onChange={setWwccFile}
                />
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Education */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileText size={14} className="text-accent" />
                Education & Qualifications
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    VCE grades / Tertiary education <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={educationDetails}
                    onChange={(e) => setEducationDetails(e.target.value)}
                    rows={3}
                    placeholder="e.g. VCE ATAR 98.5 · Bachelor of Science (Mathematics), University of Melbourne"
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
                  />
                </div>
                <FileDropZone
                  label="Upload evidence (transcript, certificate)"
                  hint="PDF or image · optional · Max 10MB"
                  accept=".pdf,.jpg,.jpeg,.png"
                  file={educationFile}
                  uploaded={educationUploaded}
                  onChange={setEducationFile}
                />
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Compliance declarations */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <ClipboardCheck size={14} className="text-primary" />
                Compliance Declarations
                <span className="ml-auto text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">Required</span>
              </h2>
              <div className="space-y-3">
                <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  wwccDeclared ? "border-accent/40 bg-accent/5" : "border-input hover:border-primary/30 hover:bg-muted/30"
                }`}>
                  <div className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                    wwccDeclared ? "bg-accent border-accent" : "border-input bg-background"
                  }`}>
                    {wwccDeclared && <CheckCircle size={12} className="text-white" />}
                  </div>
                  <input type="checkbox" className="sr-only" checked={wwccDeclared} onChange={(e) => setWwccDeclared(e.target.checked)} />
                  <div>
                    <p className="text-sm font-medium text-foreground">My WWCC is valid and current</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      I declare that my Working With Children Check is valid, current, and I will immediately notify Scholix if it lapses or is cancelled.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  codeOfConductAccepted ? "border-accent/40 bg-accent/5" : "border-input hover:border-primary/30 hover:bg-muted/30"
                }`}>
                  <div className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                    codeOfConductAccepted ? "bg-accent border-accent" : "border-input bg-background"
                  }`}>
                    {codeOfConductAccepted && <CheckCircle size={12} className="text-white" />}
                  </div>
                  <input type="checkbox" className="sr-only" checked={codeOfConductAccepted} onChange={(e) => setCodeOfConductAccepted(e.target.checked)} />
                  <div>
                    <p className="text-sm font-medium text-foreground">I accept the Tutor Code of Conduct</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      I have read and agree to the{" "}
                      <a href="/tutor-agreement" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Scholix Tutor Agreement
                      </a>
                      {" "}including safeguarding obligations, professional conduct, and payment terms.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={step === "uploading"}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
            >
              {step === "uploading" ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Submitting…</>
              ) : (
                <><CheckCircle size={15} />Submit for Verification</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Already submitted?{" "}
          <button onClick={() => navigate("/tutor/dashboard")} className="text-primary hover:underline">
            Go to Dashboard
          </button>
        </p>
      </div>
    </div>
  );
}
