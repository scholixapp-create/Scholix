import { useAuth } from "@/context/AuthContext";
import { useListSessions, useGetSessionSummary } from "@workspace/api-client-react";
import { Link } from "wouter";
import StatusBadge from "@/components/StatusBadge";
import { Calendar, GraduationCap, Bell, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function ParentDashboard() {
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
        <h1 className="text-xl font-bold text-foreground">Welcome, {user?.firstName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage sessions for your children</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-primary rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="opacity-80" />
            <span className="text-xs font-medium opacity-80">Upcoming</span>
          </div>
          <p className="text-2xl font-bold">{summary.data?.scheduled ?? 0}</p>
          <p className="text-xs opacity-70 mt-0.5">sessions booked</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{summary.data?.completed ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">sessions done</p>
        </div>
      </div>

      {/* Book session CTA */}
      <Link
        href="/parent/tutors"
        className="block mb-6 bg-gradient-to-r from-primary to-blue-500 rounded-xl p-5 text-white shadow-md hover:opacity-95 transition-opacity"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-base">Book a Session</p>
            <p className="text-xs opacity-80 mt-0.5">Browse available tutors and schedule a time</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <GraduationCap size={20} />
          </div>
        </div>
      </Link>

      {/* Upcoming sessions */}
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
            <Link
              href="/parent/tutors"
              className="inline-block mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Browse Tutors
            </Link>
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

      {/* Manage notifications CTA */}
      <Link
        href="/settings"
        className="flex items-center justify-between w-full p-4 rounded-xl bg-card border border-card-border hover:border-primary/40 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
            <Bell size={16} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Manage Notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">Control booking and session email alerts</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
      </Link>
    </div>
  );
}
