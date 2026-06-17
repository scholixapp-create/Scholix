import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, AlertCircle, CheckCircle, KeyRound, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No reset token found. Please use the link from your email or request a new one.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to reset password.");
        return;
      }
      setDone(true);
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-accent" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Password updated</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Your password has been changed successfully. You can now sign in with your new password.
          </p>
          <Link
            href="/login"
            className="block w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity text-center"
          >
            Sign in
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
          <h1 className="text-2xl font-bold text-foreground">Set new password</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a strong password for your account</p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!token ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                This link is invalid or has expired.
              </p>
              <Link href="/forgot-password" className="text-sm text-primary font-medium hover:underline">
                Request a new reset link →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Confirm new password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {loading ? "Saving…" : "Update password"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
