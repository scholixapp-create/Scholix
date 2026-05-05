import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, UserRole } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import TutorDashboard from "@/pages/tutor/Dashboard";
import TutorAvailability from "@/pages/tutor/Availability";
import TutorStudents from "@/pages/tutor/Students";
import TutorSessions from "@/pages/tutor/Sessions";
import TutorEarnings from "@/pages/tutor/Earnings";
import ParentDashboard from "@/pages/parent/Dashboard";
import ParentTutors from "@/pages/parent/Tutors";
import ParentBook from "@/pages/parent/Book";
import ParentStudents from "@/pages/parent/Students";
import StudentDashboard from "@/pages/student/Dashboard";
import StudentProgress from "@/pages/student/Progress";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminTutorApprovals from "@/pages/admin/TutorApprovals";
import AdminSessions from "@/pages/admin/Sessions";
import TutorOnboarding from "@/pages/tutor/Onboarding";
import ParentInvoices from "@/pages/parent/Invoices";
import TutorDirectory from "@/pages/TutorDirectory";
import Settings from "@/pages/Settings";
import { Clock, XCircle } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function RequireAuth({ children, role }: { children: React.ReactNode; role?: UserRole | UserRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(user.role)) {
      return <Redirect to="/" />;
    }
  }

  return <>{children}</>;
}

function RequireTutorApproved({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<null | { verificationStatus: string; wwccNumber?: string | null }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tutors/me", {
      headers: { Authorization: `Bearer ${localStorage.getItem("scholix_token") ?? ""}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setStatus(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!status || !status.wwccNumber) {
    return <Redirect to="/tutor/onboarding" />;
  }

  if (status.verificationStatus === "pending_verification") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <Clock size={28} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Application under review</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Our team is reviewing your documents. You'll be notified by email once approved — typically 1–2 business days.
          </p>
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
            <p className="text-xs font-semibold text-amber-800 mb-2">What happens next</p>
            <ul className="text-xs text-amber-700 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>Admin reviews your WWCC, ABN, and credentials</li>
              <li>You'll receive an email notification when a decision is made</li>
              <li>Once approved, parents can find and book you on Scholix</li>
            </ul>
          </div>
          <button
            onClick={() => { localStorage.removeItem("scholix_token"); window.location.href = "/login"; }}
            className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (status.verificationStatus === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
            <XCircle size={28} className="text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Application not approved</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Your application was not approved. Please re-submit with correct, up-to-date documents.
          </p>
          <a
            href="/tutor/onboarding"
            className="block mt-6 py-3 rounded-xl bg-destructive text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Re-submit Application
          </a>
          <button
            onClick={() => { localStorage.removeItem("scholix_token"); window.location.href = "/login"; }}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />

      {/* Tutor onboarding — standalone page, no approval gate */}
      <Route path="/tutor/onboarding">
        <RequireAuth role="tutor">
          <TutorOnboarding />
        </RequireAuth>
      </Route>

      {/* Tutor routes — hard-blocked until approved */}
      <Route path="/tutor/dashboard">
        <RequireAuth role="tutor">
          <RequireTutorApproved>
            <Layout><TutorDashboard /></Layout>
          </RequireTutorApproved>
        </RequireAuth>
      </Route>
      <Route path="/tutor/availability">
        <RequireAuth role="tutor">
          <RequireTutorApproved>
            <Layout><TutorAvailability /></Layout>
          </RequireTutorApproved>
        </RequireAuth>
      </Route>
      <Route path="/tutor/students">
        <RequireAuth role="tutor">
          <RequireTutorApproved>
            <Layout><TutorStudents /></Layout>
          </RequireTutorApproved>
        </RequireAuth>
      </Route>
      <Route path="/tutor/sessions">
        <RequireAuth role="tutor">
          <RequireTutorApproved>
            <Layout><TutorSessions /></Layout>
          </RequireTutorApproved>
        </RequireAuth>
      </Route>
      <Route path="/tutor/earnings">
        <RequireAuth role="tutor">
          <RequireTutorApproved>
            <Layout><TutorEarnings /></Layout>
          </RequireTutorApproved>
        </RequireAuth>
      </Route>

      {/* Parent routes */}
      <Route path="/parent/dashboard">
        <RequireAuth role="parent">
          <Layout><ParentDashboard /></Layout>
        </RequireAuth>
      </Route>
      <Route path="/parent/tutors">
        <RequireAuth role="parent">
          <Layout><ParentTutors /></Layout>
        </RequireAuth>
      </Route>
      <Route path="/parent/book/:tutorId">
        <RequireAuth role="parent">
          <Layout><ParentBook /></Layout>
        </RequireAuth>
      </Route>
      <Route path="/parent/students">
        <RequireAuth role="parent">
          <Layout><ParentStudents /></Layout>
        </RequireAuth>
      </Route>
      <Route path="/parent/invoices">
        <RequireAuth role="parent">
          <Layout><ParentInvoices /></Layout>
        </RequireAuth>
      </Route>

      {/* Public tutor directory */}
      <Route path="/tutors" component={TutorDirectory} />

      {/* Student routes */}
      <Route path="/student/dashboard">
        <RequireAuth role="student">
          <Layout><StudentDashboard /></Layout>
        </RequireAuth>
      </Route>
      <Route path="/student/progress">
        <RequireAuth role="student">
          <Layout><StudentProgress /></Layout>
        </RequireAuth>
      </Route>

      {/* Admin routes */}
      <Route path="/admin/dashboard">
        <RequireAuth role="admin">
          <Layout><AdminDashboard /></Layout>
        </RequireAuth>
      </Route>
      <Route path="/admin/users">
        <RequireAuth role="admin">
          <Layout><AdminUsers /></Layout>
        </RequireAuth>
      </Route>
      <Route path="/admin/tutors">
        <RequireAuth role="admin">
          <Layout><AdminTutorApprovals /></Layout>
        </RequireAuth>
      </Route>
      <Route path="/admin/sessions">
        <RequireAuth role="admin">
          <Layout><AdminSessions /></Layout>
        </RequireAuth>
      </Route>

      <Route path="/settings">
        <RequireAuth>
          <Layout><Settings /></Layout>
        </RequireAuth>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
