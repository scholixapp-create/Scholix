import { useState } from "react";
import { Link } from "wouter";
import { Clock, RefreshCw, CheckCircle } from "lucide-react";
import { useAuth, type AuthUser } from "@/context/AuthContext";

export default function ParentPendingApproval() {
  const { user, token, logout, updateUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const recheck = async () => {
    setChecking(true);
    setMessage("");
    setIsError(false);
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token ?? localStorage.getItem("scholix_token") ?? ""}` },
      });
      if (!res.ok) throw new Error(String(res.status));
      const current = (await res.json()) as AuthUser;
      updateUser(current);
      if (current.parentApproved === false) {
        setMessage("Your account is still awaiting approval. Please check again later.");
      }
    } catch {
      setIsError(true);
      setMessage("We could not check your approval status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6" data-testid="screen-parent-pending">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <Clock size={28} className="text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Account awaiting approval</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Thanks for joining Scholix{user?.firstName ? `, ${user.firstName}` : ""}. Every new parent account is reviewed by our team before you can book tutors or submit reviews. Use the button below to check whether your account has been approved.
        </p>
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
          <p className="text-xs font-semibold text-amber-800 mb-2">What happens next</p>
          <ul className="text-xs text-amber-700 space-y-1.5 list-disc list-inside leading-relaxed">
            <li>The Scholix team reviews your new account</li>
            <li>Once approved, your dashboard, bookings and students unlock</li>
            <li>You can check your status here at any time</li>
          </ul>
        </div>
        {message && (
          <p role={isError ? "alert" : "status"} className={`mt-4 text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`} data-testid="text-parent-recheck-result">
            {message}
          </p>
        )}
        <button
          type="button"
          onClick={recheck}
          disabled={checking}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
          data-testid="button-recheck-approval"
        >
          {checking ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle size={15} />}
          {checking ? "Checking..." : "Check approval status"}
        </button>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <Link href="/" className="text-primary hover:underline" data-testid="link-pending-home">Scholix homepage</Link>
          <button
            type="button"
            onClick={() => { logout(); window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/login`; }}
            className="text-muted-foreground hover:text-foreground underline underline-offset-2"
            data-testid="button-pending-signout"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
