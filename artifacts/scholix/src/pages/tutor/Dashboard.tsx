import { useAuth } from "@/context/AuthContext";
import { useListSessions, useGetSessionSummary, useListTutors } from "@workspace/api-client-react";
import { Link } from "wouter";
import StatusBadge from "@/components/StatusBadge";
import { Calendar, Users, DollarSign, Clock, ChevronRight, Zap, BarChart2, Star, BookOpen } from "lucide-react";
import { format, parseISO } from "date-fns";

function PlaceholderCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 flex items-start gap-3 opacity-60">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon size={16} className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground mt-1">Coming soon</span>
      </div>
    </div>
  );
}

export default function TutorDashboard() {
  const { user } = useAuth();
  const tutors = useListTutors();
  const tutorProfile = tutors.data?.find((t) => t.userId === user?.id);
  const tutorId = tutorProfile?.id;

  const sessions = useListSessions(tutorId ? { tutorId } : undefined, {
    query: { enabled: !!tutorId },
  });
  const summary = useGetSessionSummary(tutorId ? { tutorId } : undefined, {
    query: { enabled: !!tutorId },
  });

  const upcoming = sessions.data
    ?.filter((s) => s.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5) ?? [];

  const totalEarnings = sessions.data
    ?.filter((s) => s.status === "completed" && s.isPaid)
    .reduce((sum, s) => sum + s.totalAmount * 0.7, 0) ?? 0;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">{greeting()}, {user?.firstName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-primary rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="opacity-80" />
            <span className="text-xs font-medium opacity-80">Upcoming</span>
          </div>
          <p className="text-2xl font-bold">{summary.data?.scheduled ?? 0}</p>
          <p className="text-xs opacity-70 mt-0.5">sessions scheduled</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-accent" />
            <span className="text-xs font-medium text-muted-foreground">Earnings</span>
          </div>
          <p className="text-2xl font-bold text-foreground">${totalEarnings.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">total (70%)</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{summary.data?.completed ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">sessions done</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Rate</span>
          </div>
          <p className="text-2xl font-bold text-foreground">${tutorProfile?.hourlyRate ?? 65}</p>
          <p className="text-xs text-muted-foreground mt-0.5">per hour</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/tutor/availability"
            className="flex items-center gap-2 p-3 rounded-xl bg-card border border-card-border hover:border-primary/40 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock size={16} className="text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Set Availability</span>
          </Link>
          <Link
            href="/tutor/sessions"
            className="flex items-center gap-2 p-3 rounded-xl bg-card border border-card-border hover:border-primary/40 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Calendar size={16} className="text-accent" />
            </div>
            <span className="text-sm font-medium text-foreground">My Sessions</span>
          </Link>
        </div>
      </div>

      {/* Upcoming sessions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Upcoming sessions</h2>
          <Link href="/tutor/sessions" className="text-xs text-primary font-medium flex items-center gap-0.5">
            View all <ChevronRight size={12} />
          </Link>
        </div>
        {sessions.isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl p-6 text-center">
            <Calendar size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No upcoming sessions</p>
            <p className="text-xs text-muted-foreground mt-0.5">Set your availability so parents can book you</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((session) => (
              <div key={session.id} className="bg-card border border-card-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{session.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{session.studentName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(session.scheduledAt), "EEE, MMM d 'at' h:mm a")} · {session.durationMinutes}min
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={session.status} />
                    <span className="text-xs font-medium text-foreground">${session.totalAmount.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Future placeholders */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Coming soon</h2>
        <div className="space-y-2">
          <PlaceholderCard icon={BarChart2} title="Progress Dashboard" desc="Track student improvement over time" />
          <PlaceholderCard icon={Zap} title="AI Tools" desc="AI-powered lesson planning and feedback" />
          <PlaceholderCard icon={Star} title="Ratings & Reviews" desc="See what parents and students say" />
          <PlaceholderCard icon={BookOpen} title="Homework Tracking" desc="Assign and monitor homework" />
        </div>
      </div>
    </div>
  );
}
