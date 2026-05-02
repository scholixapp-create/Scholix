import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, AlertCircle } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const loginMutation = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const getDashboard = (role: string) => {
    switch (role) {
      case "tutor": return "/tutor/dashboard";
      case "parent": return "/parent/dashboard";
      case "student": return "/student/dashboard";
      case "admin": return "/admin/dashboard";
      default: return "/";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          login(data.user as any, data.token);
          navigate(getDashboard(data.user.role));
        },
        onError: () => {
          setError("Invalid email or password. Please try again.");
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
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your Scholix account</p>
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
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 bg-card border border-card-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Demo accounts</p>
          <div className="space-y-2 text-xs text-muted-foreground">
            {[
              ["Admin", "admin@scholix.com / admin123"],
              ["Tutor", "tutor1@scholix.com / tutor123"],
              ["Parent", "parent1@scholix.com / parent123"],
              ["Student", "student1@scholix.com / student123"],
            ].map(([role, creds]) => (
              <div key={role} className="flex justify-between">
                <span className="font-medium text-foreground">{role}</span>
                <span>{creds}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
