import { useAuth } from "@/context/AuthContext";
import { useListSessions, useGetSessionSummary } from "@workspace/api-client-react";
import StatusBadge from "@/components/StatusBadge";
import { Calendar, BookOpen, Zap, BarChart2 } from "lucide-react";
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

export default function StudentDashboard() {
  const { user } = useAuth();
  const sessions = useListSessions(undefined);
  const summary = useGetSessionSummary(undefined);

  const upcoming = sessions.data
    ?.filter((s) => s.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5) ?? [];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Hello, {user?.firstName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your learning journey</p>
      </div>

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
            <BookOpen size={16} className="text-accent" />
            <span className="text-xs font-medium text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{summary.data?.completed ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">sessions done</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Upcoming sessions</h2>
        </div>

        {sessions.isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl p-6 text-center">
            <Calendar size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No upcoming sessions</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ask your parent to book a session for you</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((session) => (
              <div key={session.id} className="bg-card border border-card-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{session.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">with {session.tutorName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(session.scheduledAt), "EEE, MMM d 'at' h:mm a")}
                    </p>
                  </div>
                  <StatusBadge status={session.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Coming soon</h2>
        <div className="space-y-2">
          <PlaceholderCard icon={BarChart2} title="Progress Dashboard" desc="See how you're improving across subjects" />
          <PlaceholderCard icon={BookOpen} title="Homework Tracker" desc="Track assignments set by your tutor" />
          <PlaceholderCard icon={Zap} title="AI Study Tools" desc="Personalized practice and explanations" />
        </div>
      </div>
    </div>
  );
}
