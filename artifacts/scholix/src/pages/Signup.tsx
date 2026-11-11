import { useState, useEffect } from "react";
import { BrandMark } from "@/components/Brand";
import { Link, useLocation, useSearch } from "wouter";
import { postAuthDestination, resolveSafeRedirect, withRedirect } from "@/lib/navigation";
import { useSignup, useVerifyReapplication } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, Phone, Users, ShieldCheck, RefreshCw, ArrowLeft, Clock, Home, Eye, EyeOff } from "lucide-react";
import TestModeBanner from "@/components/TestModeBanner";

type Role = "tutor" | "parent";

function apiErrorMessage(err: unknown): string {
  const e = err as { data?: { error?: unknown }; response?: { data?: { error?: unknown } }; message?: string } | null;
  if (typeof e?.data?.error === "string") return e.data.error;
  if (typeof e?.response?.data?.error === "string") return e.response.data.error;
  return e?.message ?? "";
}

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: "Weak", color: "bg-red-400" };
  if (score === 2) return { score, label: "Fair", color: "bg-amber-400" };
  if (score === 3) return { score, label: "Good", color: "bg-blue-400" };
  return { score, label: "Strong", color: "bg-accent" };
}

const roles: { value: Role; label: string; desc: string }[] = [
  { value: "tutor", label: "Tutor", desc: "Manage sessions and grow your practice" },
  { value: "parent", label: "Parent", desc: "Book sessions for your children" },
];

function formatAuPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
}

function isValidAuPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return (digits.startsWith("04") && digits.length === 10) ||
         (digits.startsWith("614") && digits.length === 11);
}

export default function Signup() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { login } = useAuth();
  const signupMutation = useSignup();
  const verifyReapplication = useVerifyReapplication();
  const [isReapplication, setIsReapplication] = useState(false);
  const [reapplyDone, setReapplyDone] = useState<string | null>(null);
  const redirectParam = new URLSearchParams(search).get("redirect");
  const [role, setRole] = useState<Role>(resolveSafeRedirect(redirectParam) ? "parent" : "tutor");
  const [step, setStep] = useState<"details" | "otp">("details");
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [emailFailed, setEmailFailed] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("role") === "student") {
      navigate("/login?student=1");
    }
  }, [search]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [error, setError] = useState("");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = raw.replace(/[^\d\s]/g, "");
    setPhone(formatAuPhone(cleaned.replace(/\s/g, "")));
    setPhoneError("");
  };

  const finishLogin = (user: any, token: string) => {
    login(user, token);
    navigate(user.role === "tutor" ? "/tutor/onboarding" : postAuthDestination(redirectParam, user.role), { replace: true });
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    if (!pendingUserId || !/^\d{6}$/.test(otp)) {
      setOtpError("Enter the six-digit code sent to your email.");
      return;
    }
    if (isReapplication) {
      verifyReapplication.mutate(
        { data: { pendingUserId, otp } },
        {
          onSuccess: (res) => {
            setReapplyDone(res.message || "Your reapplication has been submitted for review.");
            setPassword("");
          },
          onError: (err) => setOtpError(apiErrorMessage(err) || "That code is invalid or expired. Request a new one and try again."),
        },
      );
      return;
    }
    setOtpLoading(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingUserId, otp }),
      });
      const data = await response.json();
      if (!response.ok) {
        setOtpError(data.error ?? "That code is invalid or expired. Request a new one and try again.");
        return;
      }
      finishLogin(data.user, data.token);
    } catch {
      setOtpError("Unable to reach the server. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingUserId || resending) return;
    setOtpError("");
    if (isReapplication) {
      setResending(true);
      signupMutation.mutate(
        { data: { firstName, lastName, email, password, role, phone, termsAccepted } as any },
        {
          onSuccess: (data) => {
            setPendingUserId(data.pendingUserId);
            setPendingEmail(data.email);
            setDevOtp(data.devOtp ?? null);
            setEmailFailed(!!data.emailFailed);
            setOtp(data.devOtp ?? "");
          },
          onError: (err) => setOtpError(apiErrorMessage(err) || "Could not send a new code."),
          onSettled: () => setResending(false),
        },
      );
      return;
    }
    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingUserId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setOtpError(data.error ?? "Could not send a new code.");
        return;
      }
      setDevOtp(data.devOtp ?? null);
      setEmailFailed(!!data.emailFailed);
      setOtp(data.devOtp ?? "");
    } catch {
      setOtpError("Unable to reach the server. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPhoneError("");

    if (!isValidAuPhone(phone)) {
      setPhoneError("Please enter a valid Australian mobile number (e.g. 0412 345 678)");
      return;
    }

    if (!termsAccepted) {
      setError("You must accept the Terms of Service and Privacy Policy to create an account");
      return;
    }

    signupMutation.mutate(
      { data: { firstName, lastName, email, password, role, phone, termsAccepted } as any },
      {
        onSuccess: (data) => {
          setIsReapplication(!!data.reapplication);
          setPendingUserId(data.pendingUserId);
          setPendingEmail(data.email);
          setDevOtp(data.devOtp ?? null);
          setEmailFailed(!!data.emailFailed);
          setOtp(data.devOtp ?? "");
          setStep("otp");
        },
        onError: (err: any) => {
          const msg = apiErrorMessage(err);
          if (msg.includes("mobile") || msg.includes("phone")) {
            setPhoneError(msg);
          } else {
            setError(msg || "Could not create account. Email may already be in use.");
          }
        },
      }
    );
  };

  if (step === "otp" && reapplyDone) {
    return (
      <>
        <TestModeBanner />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
                <Clock size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Reapplication submitted</h1>
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-reapply-message">{reapplyDone}</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-3 text-sm text-muted-foreground">
              <p>Your email is verified and your request is with the Scholix team. Your account stays inactive and you are not signed in until an administrator approves it.</p>
              <p>The password you just chose will only take effect after approval. Until then, your previous details and history are preserved unchanged.</p>
              <Link href="/" className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90" data-testid="link-reapply-home">
                <Home size={14} /> Back to home
              </Link>
              <Link href="/login" className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground" data-testid="link-reapply-login">
                <ArrowLeft size={14} /> Go to sign in
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (step === "otp") {
    return (
      <>
        <TestModeBanner />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
                <ShieldCheck size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">{isReapplication ? "Confirm your reapplication" : "Verify your email"}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the six-digit code sent to {pendingEmail}.
              </p>
              {isReapplication && (
                <p className="text-xs text-muted-foreground mt-2" data-testid="text-reapply-otp">
                  This email belongs to an inactive account. Verifying sends a reactivation request to the Scholix team. You will stay signed out until it is approved.
                </p>
              )}
              {!isReapplication && role === "parent" && (
                <p className="text-xs text-muted-foreground mt-2" data-testid="text-parent-approval-otp">
                  After verifying, your parent account will be reviewed by the Scholix team before you can book tutors.
                </p>
              )}
            </div>
            <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
              {emailFailed && (
                <p className="text-sm text-destructive mb-4">
                  We could not deliver the email. You can request another code.
                </p>
              )}
              {devOtp && (
                <p className="text-sm text-muted-foreground mb-4">
                  Development code: <strong className="text-foreground">{devOtp}</strong>
                </p>
              )}
              {otpError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
                  <AlertCircle size={14} />
                  {otpError}
                </div>
              )}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <label className="block text-sm font-medium text-foreground" htmlFor="signup-otp">
                  Verification code
                </label>
                <input
                  id="signup-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  className="w-full px-3 py-3 rounded-lg border border-input bg-background text-center text-xl tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={otpLoading || verifyReapplication.isPending || otp.length !== 6}
                  className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {otpLoading || verifyReapplication.isPending ? "Verifying..." : isReapplication ? "Submit reapplication" : "Verify and continue"}
                </button>
              </form>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending}
                className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-primary hover:underline disabled:opacity-60"
              >
                <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
                {resending ? "Sending..." : "Send a new code"}
              </button>
              <Link
                href="/login"
                className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
    <TestModeBanner />
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <BrandMark size={56} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Create account</h1>
          <p className="text-sm text-muted-foreground mt-1">Join Scholix today</p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">I am a...</label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                      role === r.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{roles.find((r) => r.value === role)?.desc}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Australian mobile number
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <Phone size={14} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">+61</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="0412 345 678"
                  required
                  inputMode="numeric"
                  maxLength={12}
                  className={`w-full pl-14 pr-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors ${
                    phoneError ? "border-destructive focus:ring-destructive" : "border-input"
                  }`}
                />
              </div>
              {phoneError ? (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle size={11} /> {phoneError}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Used to connect with tutors/parents via WhatsApp
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                  className="w-full px-3 pr-10 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((shown) => !shown)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password && (() => {
                const str = getPasswordStrength(password);
                const filled = str.score <= 1 ? 1 : str.score === 2 ? 2 : str.score === 3 ? 3 : 4;
                const textColor = str.score <= 1 ? "text-red-500" : str.score === 2 ? "text-amber-500" : str.score === 3 ? "text-blue-500" : "text-accent";
                return (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= filled ? str.color : "bg-muted"}`} />
                      ))}
                    </div>
                    <p className={`text-[11px] font-medium ${textColor}`}>{str.label} password</p>
                  </div>
                );
              })()}
            </div>

            {/* Terms acceptance */}
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <div className="relative shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  termsAccepted
                    ? "bg-primary border-primary"
                    : "border-input bg-background group-hover:border-primary/50"
                }`}>
                  {termsAccepted && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground leading-relaxed">
                I agree to the{" "}
                <Link href="/terms" className="text-primary hover:underline font-medium">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:underline font-medium">
                  Privacy Policy
                </Link>
                {role === "tutor" && (
                  <>
                    {" "}and the{" "}
                    <Link href="/tutor-agreement" className="text-primary hover:underline font-medium">
                      Tutor Agreement
                    </Link>
                  </>
                )}
              </span>
            </label>

            {role === "parent" && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3" data-testid="text-parent-approval-note">
                New parent accounts are reviewed by the Scholix team. You can verify your email and sign in straight away, and booking opens once your account is approved.
              </p>
            )}
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3" data-testid="text-reapply-note">
              Had a Scholix tutor or parent account that was deactivated? Sign up again with the same email and role to request reactivation. Your existing name, history and role are kept, and your new password applies only once an administrator approves.
            </p>
            <button
              type="submit"
              disabled={signupMutation.isPending || !termsAccepted}
              className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {signupMutation.isPending ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href={withRedirect("/login", redirectParam)} className="text-primary font-medium hover:underline" data-testid="link-login">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
