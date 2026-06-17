import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, AlertCircle, Mail, CheckCircle, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Unable to reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-accent" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Check your inbox</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            If <strong>{email}</strong> is registered with Scholix, you'll receive a password reset link shortly. It expires in 30 minutes.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Didn't receive it? Check your spam folder, or{" "}
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-primary hover:underline font-medium"
            >
              try again
            </button>
            .
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
            <BookOpen size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Forgot password?</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your email and we'll send you a reset link</p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={13} />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
