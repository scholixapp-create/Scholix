import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, GraduationCap, Users, Shield } from "lucide-react";

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-sidebar text-white px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-6">
          <BookOpen size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Scholix</h1>
        <p className="text-base text-white/70 max-w-xs mx-auto mb-8">
          The tutoring platform that empowers independent tutors and connects families with expert educators.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="px-4 py-10 max-w-lg mx-auto">
        <h2 className="text-lg font-bold text-foreground text-center mb-6">Built for everyone</h2>
        <div className="space-y-3">
          {[
            { icon: GraduationCap, title: "For Tutors", desc: "Set your rate, manage availability, track sessions and earnings all in one place.", color: "bg-primary/10 text-primary" },
            { icon: Users, title: "For Parents", desc: "Browse verified tutors, book sessions, and pay securely before each lesson.", color: "bg-accent/10 text-accent" },
            { icon: BookOpen, title: "For Students", desc: "Stay on top of your schedule and track your learning progress over time.", color: "bg-purple-100 text-purple-600" },
            { icon: Shield, title: "Platform trust", desc: "Every tutor is verified. 30% platform fee ensures quality and support for all users.", color: "bg-yellow-100 text-yellow-700" },
          ].map((f) => (
            <div key={f.title} className="bg-card border border-card-border rounded-xl p-4 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${f.color}`}>
                <f.icon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/signup"
            className="inline-block px-8 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Create your account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      switch (user.role) {
        case "tutor": navigate("/tutor/dashboard"); break;
        case "parent": navigate("/parent/dashboard"); break;
        case "student": navigate("/student/dashboard"); break;
        case "admin": navigate("/admin/dashboard"); break;
      }
    }
  }, [user, isLoading]);

  if (isLoading) return null;
  if (user) return null;

  return <LandingPage />;
}
