import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, Mail, User, ArrowLeft, ExternalLink } from "lucide-react";
import Layout from "@/components/Layout";

interface PublicTutor {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  subjects: string[];
  bio: string | null;
  hourlyRate: number;
  isApproved: boolean;
  user?: { email: string; phone: string | null };
}

function ProfileCard({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

// Current user's own profile
function MyProfile() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user) return null;

  const roleLabel: Record<string, string> = {
    tutor: "Tutor",
    parent: "Parent",
    student: "Student",
    admin: "Administrator",
  };

  const dashboardHref: Record<string, string> = {
    tutor: "/tutor/dashboard",
    parent: "/parent/dashboard",
    student: "/student/dashboard",
    admin: "/admin/dashboard",
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-6">
        <button
          onClick={() => navigate(dashboardHref[user.role] ?? "/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </button>

        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="bg-sidebar px-6 py-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-3">
              <User size={28} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold text-white">
              {user.firstName} {user.lastName}
            </h1>
            <span className="mt-1 px-3 py-0.5 rounded-full bg-white/10 text-white/80 text-xs font-medium">
              {roleLabel[user.role] ?? user.role}
            </span>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail size={16} className="text-muted-foreground shrink-0" />
              <span className="text-foreground">{user.email}</span>
            </div>

            <div className="pt-3 border-t border-border flex flex-col gap-2">
              <Link
                href="/settings"
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
              >
                Account settings
                <ExternalLink size={14} className="text-muted-foreground" />
              </Link>
              {user.role === "tutor" && (
                <Link
                  href="/tutor/onboarding"
                  className="flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
                >
                  Verification & documents
                  <ExternalLink size={14} className="text-muted-foreground" />
                </Link>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Member since {new Date(user.createdAt).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
        </p>
      </div>
    </Layout>
  );
}

// Public profile by ID — redirects to tutor page if applicable
function PublicProfile({ id }: { id: string }) {
  const [tutor, setTutor] = useState<PublicTutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch(`/api/tutors/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setTutor(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <User size={24} className="text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Profile not found</h1>
        <p className="text-sm text-muted-foreground text-center">This user doesn't have a public profile.</p>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft size={14} />
          Go home
        </button>
      </div>
    );
  }

  // Redirect to the tutor profile page
  navigate(`/tutor/${id}`, { replace: true });
  return null;
}

export function ProfileMe() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return <MyProfile />;
}

export function ProfileById() {
  const [, params] = useRoute("/profile/:id");
  const id = params?.id ?? "";

  if (!id) return null;
  return <PublicProfile id={id} />;
}
