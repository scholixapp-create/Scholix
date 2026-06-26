import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, AlertCircle, ShieldCheck, RefreshCw, ArrowLeft, FlaskConical, Users } from "lucide-react";
import TestModeBanner from "@/components/TestModeBanner";

function getDashboard(role: string) {
  switch (role) {
    case "tutor": return "/tutor/dashboard";
    case "parent": return "/parent/dashboard";
    case "student": return "/student/dashboard";
    case "admin": return "/admin/dashboard";
    default: return "/";
  }
}

export default function Login() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const showStudentNote = new URLSearchParams(search).get("student") === "1";
  const { login } = useAuth();

  // Login step state
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid email or password.");
        return;
      }
      // OTP flow
      if (data.requiresOtp) {
        setPendingUserId(data.pendingUserId);
        setPendingEmail(data.email ?? email);
        if (data.devOtp) {
          setDevOtp(data.devOtp);
          setOtp(String(data.devOtp).split(""));
        }
        setStep("otp");
        setResendCooldown(30);
      }
    } catch {
      setError("Unable to reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingUserId, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid code. Please try again.");
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
        return;
      }
      login(data.user, data.token);
      navigate(getDashboard(data.user.role));
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !pendingUserId) return;
    setError("");
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingUserId }),
      });
      if (res.ok) {
        const resendData = await res.json().catch(() => ({})) as { devOtp?: string };
        if (resendData.devOtp) {
          setDevOtp(resendData.devOtp);
          setOtp(String(resendData.devOtp).split(""));
        } else {
          setDevOtp(null);
          setOtp(["", "", "", "", "", ""]);
          otpRefs.current[0]?.focus();
        }
        setResendCooldown(30);
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to resend code.");
      }
    } catch {
      setError("Unable to resend. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleOtpInput = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      e.preventDefault();
      setOtp(text.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  return (
    <>
      <TestModeBanner />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {showStudentNote && (
            <div className="flex items-start gap-3 p-4 mb-4 rounded-xl bg-primary/5 border border-primary/20">
              <Users size={16} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Student accounts are managed by parents</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Parents create and manage student profiles from their dashboard — students don't need their own login. Ask your parent to add you from their <strong>Parent Dashboard → Students</strong>.
                </p>
              </div>
            </div>
          )}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
              <BookOpen size={24} className="text-white" />
            </div>
            {step === "credentials" ? (
              <>
                <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
                <p className="text-sm text-muted-foreground mt-1">Sign in to your Scholix account</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground">Check your inbox</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  We sent a 6-digit code to <strong>{pendingEmail}</strong>
                </p>
              </>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            {step === "credentials" ? (
              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {loading ? "Sending code…" : "Continue"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtp} className="space-y-5">
                {/* OTP icon */}
                <div className="flex justify-center mb-1">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ShieldCheck size={22} className="text-primary" />
                  </div>
                </div>

                {/* Dev mode banner */}
                {devOtp && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-50 border border-violet-200 text-violet-800 text-xs">
                    <FlaskConical size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Email delivery in test mode</p>
                      <p className="mt-0.5 text-violet-600">
                        No email provider configured. Your code <strong className="font-mono tracking-widest">{devOtp}</strong> has been pre-filled.
                      </p>
                    </div>
                  </div>
                )}

                {/* 6-digit input */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3 text-center">
                    Enter verification code
                  </label>
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpInput(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`w-11 h-12 text-center text-lg font-bold rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
                          digit ? "border-primary text-foreground" : "border-input text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.join("").length !== 6}
                  className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {loading ? "Verifying…" : "Sign in"}
                </button>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => { setStep("credentials"); setError(""); setOtp(["", "", "", "", "", ""]); }}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <ArrowLeft size={12} />
                    Use different email
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resending}
                    className="flex items-center gap-1 hover:text-foreground disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw size={12} className={resending ? "animate-spin" : ""} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-4 pt-4 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="text-primary font-medium hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
