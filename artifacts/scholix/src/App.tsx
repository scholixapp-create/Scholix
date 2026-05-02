import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, UserRole } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import TutorDashboard from "@/pages/tutor/Dashboard";
import TutorAvailability from "@/pages/tutor/Availability";
import TutorStudents from "@/pages/tutor/Students";
import TutorSessions from "@/pages/tutor/Sessions";
import ParentDashboard from "@/pages/parent/Dashboard";
import ParentTutors from "@/pages/parent/Tutors";
import ParentBook from "@/pages/parent/Book";
import StudentDashboard from "@/pages/student/Dashboard";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminTutorApprovals from "@/pages/admin/TutorApprovals";
import AdminSessions from "@/pages/admin/Sessions";

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
  const [location] = useLocation();

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />

      {/* Tutor routes */}
      <Route path="/tutor/dashboard">
        <RequireAuth role="tutor">
          <Layout><TutorDashboard /></Layout>
        </RequireAuth>
      </Route>
      <Route path="/tutor/availability">
        <RequireAuth role="tutor">
          <Layout><TutorAvailability /></Layout>
        </RequireAuth>
      </Route>
      <Route path="/tutor/students">
        <RequireAuth role="tutor">
          <Layout><TutorStudents /></Layout>
        </RequireAuth>
      </Route>
      <Route path="/tutor/sessions">
        <RequireAuth role="tutor">
          <Layout><TutorSessions /></Layout>
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

      {/* Student routes */}
      <Route path="/student/dashboard">
        <RequireAuth role="student">
          <Layout><StudentDashboard /></Layout>
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
