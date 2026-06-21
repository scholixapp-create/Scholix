import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useListSessions, useListStudents } from "@workspace/api-client-react";
import { Link } from "wouter";
import StatusBadge from "@/components/StatusBadge";
import {
  Calendar, BookOpen, Clock, GraduationCap,
  ChevronRight, CheckCircle2, XCircle, Inbox,
  BarChart2, Bell,
} from "lucide-react";
import { format, parseISO } from "date-fns";

function getToken() { return localStorage.getItem("scholix_token") ?? ""; }

type Tab = "upcoming" | "history";

interface Session {
  id: number;
  subject: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  isPaid: boolean;
  totalAmount: number;
  tutorName: string;
  studentName: string;
}

function CountdownBadge({ scheduledAt }: { scheduledAt: string }) {
  const date = parseISO(scheduledAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 24 && diffHours >= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">
        In {diffHours}h
      </span>
    );
  }
  if (diffDays < 7 && diffDays >= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
        In {diffDays}d
      </span>
    );
  }
  return null;
}

function UpcomingCard({ session }: { session: Session }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <BookOpen size={15} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{session.subject}</p>
              <CountdownBadge scheduledAt={session.scheduledAt} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">with {session.tutorName}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar size={11} />
                {format(parseISO(session.scheduledAt), "EEE, MMM d 'at' h:mm a")}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock size={11} />
                {session.durationMinutes}m
              </span>
            </div>
          </div>
        </div>
        <StatusBadge status={session.status as any} />
      </div>
    </div>
  );
}

function HistoryCard({ session }: { session: Session }) {
  const isCompleted = session.status === "completed";
  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
          isCompleted ? "bg-accent/10" : "bg-muted"
        }`}>
          {isCompleted
            ? <CheckCircle2 size={15} className="text-accent" />
            : <XCircle size={15} className="text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{session.subject}</p>
              <p className="text-xs text-muted-foreground mt-0.5">with {session.tutorName}</p>
            </div>
            {isCompleted && (
              <span className="text-sm font-semibold text-foreground shrink-0">
                ${session.totalAmount.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar size={11} />
              {format(parseISO(session.scheduledAt), "MMM d, yyyy · h:mm a")}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock size={11} />
              {session.durationMinutes}m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestSessionCard({ studentName: _studentName, parentId }: { studentName: string; parentId: number | null }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const handleRequest = async () => {
    if (!parentId) return;
    setState("sending");
    try {
      const res = await fetch("/api/notifications/request-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({}),
      });
      setState(res.ok ? "sent" : "idle");
    } catch {
      setState("idle");
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/5 to-blue-50 border border-primary/20 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <GraduationCap size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Want a session?</p>
          {!parentId ? (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Ask a parent or guardian to create your account and book a tutoring session for you.
            </p>
          ) : state === "sent" ? (
            <div className="mt-3 flex items-center gap-1.5 text-accent text-xs font-semibold">
              <CheckCircle2 size={13} /> Request sent to your parent!
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Tap the button below to notify your parent that you'd like to book a tutoring session.
              </p>
              <button
                onClick={handleRequest}
                disabled={state === "sending"}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
              >
                {state === "sending" ? "Sending…" : "Request a session"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
        {tab === "upcoming"
          ? <Calendar size={20} className="text-muted-foreground" />
          : <Inbox size={20} className="text-muted-foreground" />}
      </div>
      {tab === "upcoming" ? (
        <>
          <p className="text-sm font-medium text-foreground">No upcoming sessions</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ask your parent to book a tutoring session for you
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">No session history yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your completed and cancelled sessions will appear here
          </p>
        </>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("upcoming");

  const allStudents = useListStudents();
  const allSessions = useListSessions(undefined);

  const myStudent = allStudents.data?.find((s) => s.userId === user?.id) ?? null;

  const mySessions: Session[] = (allSessions.data ?? []).filter(
    (s) => myStudent && s.studentId === myStudent.id
  ) as Session[];

  const upcoming = mySessions
    .filter((s) => s.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const history = mySessions
    .filter((s) => s.status !== "scheduled")
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const totalHours = mySessions
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.durationMinutes / 60, 0);

  const subjects = [...new Set(mySessions.map((s) => s.subject))];

  const isLoading = allStudents.isLoading || allSessions.isLoading;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Hello, {user?.firstName} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Here's your learning overview</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-primary rounded-xl p-3 text-white text-center">
          <p className="text-2xl font-bold">{upcoming.length}</p>
          <p className="text-[10px] opacity-75 mt-0.5 leading-tight">Upcoming</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{history.filter(s => s.status === "completed").length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Completed</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Hours learned</p>
        </div>
      </div>

      {/* Subject pills */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {subjects.map((s) => (
            <span key={s} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <Link
          href="/student/progress"
          className="flex items-center gap-2 p-3 rounded-xl bg-card border border-card-border hover:border-primary/40 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart2 size={15} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">My Progress</p>
            <p className="text-[10px] text-muted-foreground">Scores & notes</p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-2 p-3 rounded-xl bg-card border border-card-border hover:border-primary/40 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Bell size={15} className="text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">Notifications</p>
            <p className="text-[10px] text-muted-foreground">Manage emails</p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
        </Link>
      </div>

      {/* Request session card */}
      {!isLoading && (
        <div className="mb-5">
          <RequestSessionCard
          studentName={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()}
          parentId={myStudent?.parentId ?? null}
        />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl mb-4">
        <button
          onClick={() => setTab("upcoming")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            tab === "upcoming"
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar size={14} />
          Upcoming
          {upcoming.length > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              tab === "upcoming" ? "bg-primary text-white" : "bg-muted-foreground/20 text-muted-foreground"
            }`}>
              {upcoming.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            tab === "history"
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock size={14} />
          History
          {history.length > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              tab === "history" ? "bg-primary text-white" : "bg-muted-foreground/20 text-muted-foreground"
            }`}>
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : tab === "upcoming" ? (
        <div className="space-y-3">
          {upcoming.length === 0 ? <EmptyState tab="upcoming" /> : upcoming.map((session) => (
            <UpcomingCard key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {history.length === 0 ? <EmptyState tab="history" /> : history.map((session) => (
            <HistoryCard key={session.id} session={session} />
          ))}
        </div>
      )}

      {!isLoading && upcoming.length > 0 && tab === "upcoming" && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <GraduationCap size={14} className="text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Tip:</span> Join your session a few minutes early so you can have your materials ready.
          </p>
        </div>
      )}
    </div>
  );
}
