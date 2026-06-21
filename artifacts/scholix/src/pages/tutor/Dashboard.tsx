import { useAuth } from "@/context/AuthContext";
import { useListSessions, useGetSessionSummary, useListTutors, useGetTutorAvailability } from "@workspace/api-client-react";
import { Link } from "wouter";
import StatusBadge from "@/components/StatusBadge";
import {
  Calendar, Users, DollarSign, Clock, ChevronRight, Zap, BarChart2, Star, BookOpen,
  Shield, AlertCircle, XCircle, Bell, TrendingUp, UserPlus, Layers, ArrowUp, Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";

interface TutorVerification {
  verificationStatus: string;
  wwccNumber?: string | null;
}

function getToken() { return localStorage.getItem("scholix_token") ?? ""; }

function VerificationBanner({ status, hasWwcc }: { status: string; hasWwcc: boolean }) {
  if (status === "approved") return null;

  if (status === "rejected") return (
    <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
      <XCircle size={18} className="text-destructive shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-destructive">Verification rejected</p>
        <p className="text-xs text-destructive/80 mt-0.5">Your application was not approved. Please re-submit with correct documents.</p>
      </div>
      <Link href="/tutor/onboarding" className="shrink-0 px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-semibold hover:opacity-90 transition-opacity">
        Re-submit
      </Link>
    </div>
  );

  if (!hasWwcc) return (
    <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
      <Shield size={18} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-800">Complete your verification</p>
        <p className="text-xs text-amber-700 mt-0.5">Upload your WWCC to start appearing in search and accepting bookings.</p>
      </div>
      <Link href="/tutor/onboarding" className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity">
        Verify now
      </Link>
    </div>
  );

  return (
    <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
      <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-blue-800">Your account is pending verification</p>
        <p className="text-xs text-blue-700 mt-0.5">Our team is reviewing your documents. You'll be notified once approved (1–2 business days).</p>
      </div>
    </div>
  );
}

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

const COMMISSION_TIERS = [
  { name: "Standard",    min: 0,  max: 9,  rate: 30, color: "bg-slate-400" },
  { name: "Growth",      min: 10, max: 24, rate: 25, color: "bg-blue-500" },
  { name: "Established", min: 25, max: 49, rate: 20, color: "bg-violet-500" },
  { name: "Expert",      min: 50, max: Infinity, rate: 15, color: "bg-green-500" },
];

function GrowEarningsSection({
  completedSessions,
  hourlyRate,
  profileComplete,
  hasAvailability,
}: {
  completedSessions: number;
  hourlyRate: number;
  profileComplete: boolean;
  hasAvailability: boolean;
}) {
  const currentTier = COMMISSION_TIERS.find(
    (t) => completedSessions >= t.min && completedSessions <= t.max
  ) ?? COMMISSION_TIERS[0];

  const nextTier = COMMISSION_TIERS.find((t) => t.min > completedSessions);
  const progressToNext = nextTier
    ? Math.min(((completedSessions - currentTier.min) / (nextTier.min - currentTier.min)) * 100, 100)
    : 100;

  const suggestedRate = hourlyRate < 75 ? 75 : hourlyRate < 90 ? 90 : hourlyRate < 110 ? 110 : null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} className="text-accent" />
        <h2 className="text-sm font-semibold text-foreground">Grow Your Earnings</h2>
      </div>

      <div className="space-y-3">
        {/* 0 — Getting Paid During Beta */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Wallet size={14} className="text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-amber-800">Getting Paid During Beta</p>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed mb-3">
            Payments are not processed through Scholix yet. To get paid:
          </p>
          <div className="space-y-2 mb-3">
            {[
              "Agree on a payment method with your student/parent",
              "Receive payment via PayID, bank transfer, or cash",
              "Use Scholix to track sessions and generate invoices",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-[9px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-xs text-amber-800 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-amber-600 font-medium">
            Full payment processing coming soon.
          </p>
        </div>

        {/* 1 — Get More Students */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UserPlus size={14} className="text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Get More Students</p>
          </div>
          <div className="space-y-2">
            {[
              { done: profileComplete, text: "Complete your profile with a bio and subjects" },
              { done: hasAvailability, text: "Set your weekly availability" },
              { done: false, text: "Share your Scholix profile link with students" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                  item.done ? "bg-accent border-accent" : "border-muted-foreground/40"
                }`}>
                  {item.done && <span className="text-white text-[8px] font-bold">✓</span>}
                </div>
                <p className={`text-xs leading-relaxed ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/tutor/profile"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary hover:underline"
          >
            Update profile <ChevronRight size={11} />
          </Link>
        </div>

        {/* 2 — Commission Progress */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <BarChart2 size={14} className="text-violet-600" />
            </div>
            <p className="text-sm font-semibold text-foreground">Commission Progress</p>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs text-muted-foreground">Current tier: </span>
              <span className="text-xs font-bold text-foreground">{currentTier.name}</span>
            </div>
            <span className="text-xs font-bold text-foreground">{currentTier.rate}% fee</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all ${currentTier.color}`}
              style={{ width: `${progressToNext}%` }}
            />
          </div>

          {nextTier ? (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{nextTier.min - completedSessions} more sessions</span>{" "}
              to reach {nextTier.name} tier ({nextTier.rate}% fee) — save ${((currentTier.rate - nextTier.rate) / 100 * hourlyRate).toFixed(0)}/session
            </p>
          ) : (
            <p className="text-[11px] text-accent font-semibold">🎉 You've reached Expert tier — lowest fee on Scholix!</p>
          )}

          {/* Tier ladder */}
          <div className="mt-3 grid grid-cols-4 gap-1">
            {COMMISSION_TIERS.map((t) => (
              <div
                key={t.name}
                className={`text-center p-1.5 rounded-lg border ${
                  t.name === currentTier.name
                    ? "border-primary/40 bg-primary/5"
                    : "border-border"
                }`}
              >
                <p className="text-[9px] font-bold text-foreground">{t.rate}%</p>
                <p className={`text-[9px] ${t.name === currentTier.name ? "text-primary font-semibold" : "text-muted-foreground"}`}>{t.name}</p>
                <p className="text-[8px] text-muted-foreground/70">{t.min === 50 ? "50+" : `${t.min}–${t.max}`}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3 — Increase Your Rate */}
        {suggestedRate && (
          <div className="bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <ArrowUp size={14} className="text-accent" />
              </div>
              <p className="text-sm font-semibold text-foreground">Increase Your Rate</p>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Your current rate</span>
              <span className="text-sm font-bold text-foreground">${hourlyRate}/hr</span>
            </div>
            <div className="bg-accent/10 rounded-lg px-3 py-2 mb-3">
              <p className="text-xs text-accent font-medium">
                Top tutors on Scholix charge ${suggestedRate}+/hr — consider raising your rate.
              </p>
            </div>
            <Link
              href="/tutor/profile"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              Update my rate <ChevronRight size={11} />
            </Link>
          </div>
        )}

        {/* 4 — Group Sessions */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <Layers size={14} className="text-green-600" />
            </div>
            <p className="text-sm font-semibold text-foreground">Group Sessions</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold">Coming soon</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Teach multiple students at once and multiply your income without extra hours.
          </p>
          <div className="bg-muted/50 rounded-lg px-3 py-2">
            <p className="text-[11px] font-semibold text-foreground">Example</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              3 students × ${Math.round(hourlyRate * 0.6)}/hr = <span className="font-bold text-accent">${Math.round(hourlyRate * 0.6 * 3)}/hr</span> — versus ${hourlyRate}/hr solo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TutorDashboard() {
  const { user } = useAuth();
  const [verif, setVerif] = useState<TutorVerification | null>(null);
  const tutors = useListTutors();
  const tutorProfile = tutors.data?.find((t) => t.userId === user?.id);
  const tutorId = tutorProfile?.id;
  const hourlyRate = tutorProfile?.hourlyRate ?? 65;

  const availability = useGetTutorAvailability(tutorId ?? 0, {
    query: { enabled: !!tutorId } as any,
  });
  const hasAvailability = (availability.data?.filter((s: { isBooked?: boolean }) => !s.isBooked).length ?? 0) > 0;
  const profileComplete = !!(tutorProfile?.bio?.trim() && (tutorProfile?.subjects?.length ?? 0) > 0);

  useEffect(() => {
    const fetchVerif = () => {
      fetch("/api/tutors/me", { headers: { Authorization: `Bearer ${getToken()}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setVerif(data); })
        .catch(() => {});
    };
    fetchVerif();
    const interval = setInterval(fetchVerif, 60_000);
    return () => clearInterval(interval);
  }, []);

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

  const completedSessions = sessions.data?.filter((s) => s.status === "completed").length ?? 0;

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
      {verif && (
        <VerificationBanner
          status={verif.verificationStatus}
          hasWwcc={!!verif.wwccNumber}
        />
      )}

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
            <span className="text-xs font-medium text-muted-foreground">Your Growth</span>
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
          <p className="text-2xl font-bold text-foreground">${hourlyRate}</p>
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
          <h2 className="text-sm font-semibold text-foreground">Your Week</h2>
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

      {/* Grow Your Earnings */}
      <GrowEarningsSection
        completedSessions={completedSessions}
        hourlyRate={hourlyRate}
        profileComplete={profileComplete}
        hasAvailability={hasAvailability}
      />

      {/* Coming soon */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Coming soon</h2>
        <div className="space-y-2">
          <PlaceholderCard icon={BarChart2} title="Progress Dashboard" desc="Track student improvement over time" />
          <PlaceholderCard icon={Zap} title="AI Tools" desc="AI-powered lesson planning and feedback" />
          <PlaceholderCard icon={Star} title="Ratings & Reviews" desc="See what parents and students say" />
          <PlaceholderCard icon={BookOpen} title="Homework Tracking" desc="Assign and monitor homework" />
        </div>
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
