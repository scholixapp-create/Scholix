import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSignup } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, AlertCircle, Phone } from "lucide-react";

type Role = "tutor" | "parent" | "student";

const roles: { value: Role; label: string; desc: string }[] = [
  { value: "tutor", label: "Tutor", desc: "Manage sessions and grow your practice" },
  { value: "parent", label: "Parent", desc: "Book sessions for your children" },
  { value: "student", label: "Student", desc: "Access your scheduled sessions" },
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
  const { login } = useAuth();
  const signupMutation = useSignup();
  const [role, setRole] = useState<Role>("tutor");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [error, setError] = useState("");

  const getDashboard = (role: string) => {
    switch (role) {
      case "tutor": return "/tutor/dashboard";
      case "parent": return "/parent/dashboard";
      case "student": return "/student/dashboard";
      default: return "/";
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Only allow digits and spaces
    const cleaned = raw.replace(/[^\d\s]/g, "");
    setPhone(formatAuPhone(cleaned.replace(/\s/g, "")));
    setPhoneError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPhoneError("");

    if (!isValidAuPhone(phone)) {
      setPhoneError("Please enter a valid Australian mobile number (e.g. 0412 345 678)");
      return;
    }

    signupMutation.mutate(
      { data: { firstName, lastName, email, password, role, phone } },
      {
        onSuccess: (data) => {
          login(data.user as any, data.token);
          if (data.user.role === "tutor") {
            navigate("/tutor/onboarding");
          } else {
            navigate(getDashboard(data.user.role));
          }
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error ?? err?.message ?? "";
          if (msg.includes("mobile") || msg.includes("phone")) {
            setPhoneError(msg);
          } else {
            setError(msg || "Could not create account. Email may already be in use.");
          }
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
            <BookOpen size={24} className="text-white" />
          </div>
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength={6}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={signupMutation.isPending}
              className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {signupMutation.isPending ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
