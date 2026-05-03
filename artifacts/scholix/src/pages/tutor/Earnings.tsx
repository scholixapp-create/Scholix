import { useAuth } from "@/context/AuthContext";
import { useListSessions, useListTutors } from "@workspace/api-client-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, TrendingUp, Clock, Users, Calendar,
  ArrowUpRight, Wallet, AlertCircle, Sparkles, Trophy, ChevronRight, Star,
} from "lucide-react";
import { format, parseISO, startOfWeek, addWeeks, subWeeks, isWithinInterval, endOfWeek, nextFriday } from "date-fns";

function getToken() { return localStorage.getItem("scholix_token") ?? ""; }

function statusLabel(status: string, isPaid: boolean) {
  if (status === "completed" && isPaid) return { label: "Paid", color: "bg-accent/10 text-accent" };
  if (status === "completed" && !isPaid) return { label: "Pending", color: "bg-amber-100 text-amber-700" };
  if (status === "scheduled" && isPaid) return { label: "Upcoming", color: "bg-primary/10 text-primary" };
  if (status === "cancelled") return { label: "Cancelled", color: "bg-destructive/10 text-destructive" };
  return { label: "Pending", color: "bg-amber-100 text-amber-700" };
}

const COMMISSION_TIERS = [
  { label: "Starter", threshold: 0, rate: 30, color: "bg-muted", textColor: "text-muted-foreground" },
  { label: "Growth", threshold: 10, rate: 25, color: "bg-primary/15", textColor: "text-primary" },
  { label: "Established", threshold: 25, rate: 20, color: "bg-accent/15", textColor: "text-accent" },
  { label: "Expert", threshold: 50, rate: 15, color: "bg-amber-100", textColor: "text-amber-700" },
];

function SummaryCard({
  icon: Icon, label, value, sub, highlight,
}: {
  icon: any; label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? "bg-primary border-primary/20 text-white" : "bg-card border-card-border"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium ${highlight ? "text-white/70" : "text-muted-foreground"}`}>{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${highlight ? "bg-white/15" : "bg-muted"}`}>
          <Icon size={15} className={highlight ? "text-white" : "text-muted-foreground"} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-white" : "text-foreground"}`}>{value}</p>
      {sub && <p className={`text-[11px] mt-0.5 ${highlight ? "text-white/60" : "text-muted-foreground"}`}>{sub}</p>}
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-card-border rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="text-muted-foreground mb-1">{label}</p>
        <p className="font-semibold text-foreground">${payload[0].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

function CommissionTierCard({ completedCount }: { completedCount: number }) {
  const currentTierIdx = COMMISSION_TIERS.reduce((best, tier, i) =>
    completedCount >= tier.threshold ? i : best, 0);
  const currentTier = COMMISSION_TIERS[currentTierIdx];
  const nextTier = COMMISSION_TIERS[currentTierIdx + 1];
  const progress = nextTier
    ? Math.min(100, ((completedCount - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100)
    : 100;

  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Trophy size={14} className="text-amber-500" />
          Commission Milestones
        </h2>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${currentTier.color} ${currentTier.textColor}`}>
          {currentTier.label} — {currentTier.rate}% fee
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Complete more sessions to unlock a lower platform commission rate.
      </p>

      {/* Progress to next tier */}
      {nextTier && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">{completedCount} sessions</span>
            <span className="font-medium text-foreground">
              {nextTier.threshold - completedCount} more to unlock {nextTier.rate}% fee
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Tier grid */}
      <div className="grid grid-cols-2 gap-2">
        {COMMISSION_TIERS.map((tier, i) => {
          const isUnlocked = completedCount >= tier.threshold;
          const isCurrent = i === currentTierIdx;
          return (
            <div
              key={tier.label}
              className={`rounded-lg p-3 border transition-all ${
                isCurrent
                  ? "border-primary/30 bg-primary/5"
                  : isUnlocked
                  ? "border-accent/20 bg-accent/5"
                  : "border-border bg-muted/30 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-foreground">{tier.label}</span>
                {isUnlocked ? (
                  <span className="text-[9px] text-accent font-bold uppercase tracking-wide">
                    {isCurrent ? "Active" : "Done"}
                  </span>
                ) : (
                  <span className="text-[9px] text-muted-foreground">{tier.threshold}+ sessions</span>
                )}
              </div>
              <p className={`text-lg font-bold ${isCurrent ? "text-primary" : isUnlocked ? "text-accent" : "text-muted-foreground"}`}>
                {tier.rate}%
              </p>
              <p className="text-[10px] text-muted-foreground">platform fee</p>
            </div>
          );
        })}
      </div>

      {!nextTier && (
        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <Star size={12} className="text-amber-600 shrink-0" />
          <p className="text-[11px] text-amber-700 font-medium">Expert tier unlocked — lowest possible fee of 15%!</p>
        </div>
      )}
    </div>
  );
}

function FirstStudentFreeCard({ freeSessions }: { freeSessions: number }) {
  return (
    <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
          <Sparkles size={16} className="text-accent" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">First Student Free</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Your very first student on Scholix pays <span className="font-semibold text-accent">0% commission — forever</span>.
            All other new students get their first session free too.
          </p>
          {freeSessions > 0 && (
            <p className="text-xs font-semibold text-accent mt-2">
              {freeSessions} free session{freeSessions !== 1 ? "s" : ""} used so far
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TutorEarnings() {
  const { user } = useAuth();
  const tutors = useListTutors();
  const sessions = useListSessions(undefined);

  const myTutor = tutors.data?.find((t) => t.userId === user?.id) ?? null;

  const mySessions = (sessions.data ?? []).filter(
    (s) => myTutor && s.tutorId === myTutor.id
  );

  const paidCompleted = mySessions.filter((s) => s.status === "completed" && s.isPaid);
  const pendingSessions = mySessions.filter((s) => s.status === "scheduled" && s.isPaid);

  // Per-session earnings — respect actual commission (isCommissionFree means 100% to tutor)
  function sessionEarnings(s: typeof mySessions[0]) {
    if ((s as any).isCommissionFree) return s.totalAmount;
    return s.totalAmount * 0.7;
  }
  function sessionFee(s: typeof mySessions[0]) {
    if ((s as any).isCommissionFree) return 0;
    return s.totalAmount * 0.3;
  }

  const totalEarnings = paidCompleted.reduce((sum, s) => sum + sessionEarnings(s), 0);
  const pendingPayout = pendingSessions.reduce((sum, s) => sum + sessionEarnings(s), 0);
  const freeSessions = mySessions.filter((s) => (s as any).isCommissionFree).length;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEarnings = paidCompleted
    .filter((s) => isWithinInterval(parseISO(s.scheduledAt), { start: weekStart, end: weekEnd }))
    .reduce((sum, s) => sum + sessionEarnings(s), 0);

  const completedCount = paidCompleted.length;
  const uniqueStudents = [...new Set(mySessions.map((s) => s.studentId))].length;
  const avgRate = myTutor?.hourlyRate ?? 0;
  const weeksActive = Math.max(1, Math.ceil(mySessions.length / 2));
  const sessionsPerWeek = (mySessions.length / weeksActive).toFixed(1);
  const earningsPerStudent = uniqueStudents > 0 ? (totalEarnings / uniqueStudents).toFixed(2) : "0.00";

  const chartData = Array.from({ length: 8 }, (_, i) => {
    const weekAgo = subWeeks(now, 7 - i);
    const wStart = startOfWeek(weekAgo, { weekStartsOn: 1 });
    const wEnd = endOfWeek(weekAgo, { weekStartsOn: 1 });
    const label = format(wStart, "MMM d");
    const earned = paidCompleted
      .filter((s) => isWithinInterval(parseISO(s.scheduledAt), { start: wStart, end: wEnd }))
      .reduce((sum, s) => sum + sessionEarnings(s), 0);
    const mockBase = [42, 0, 59.5, 85, 0, 119, 0][i] ?? 0;
    return { label, earned: earned > 0 ? earned : mockBase };
  });

  const nextPayoutDate = nextFriday(now);
  const nextPayoutAmount = (pendingPayout + thisWeekEarnings).toFixed(2);
  const isLoading = tutors.isLoading || sessions.isLoading;

  const allRows = [...mySessions].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Earnings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Complete more sessions to unlock lower commission rates
        </p>
      </div>

      {/* First Student Free promo */}
      <FirstStudentFreeCard freeSessions={freeSessions} />

      {/* Commission tier milestone */}
      <CommissionTierCard completedCount={completedCount} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard icon={DollarSign} label="Total Earnings" value={`$${totalEarnings.toFixed(2)}`} sub="All time, after fees" highlight />
        <SummaryCard icon={TrendingUp} label="This Week" value={`$${thisWeekEarnings.toFixed(2)}`} sub={`${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`} />
        <SummaryCard icon={Wallet} label="Pending Payout" value={`$${pendingPayout.toFixed(2)}`} sub={`${pendingSessions.length} upcoming paid sessions`} />
        <SummaryCard icon={Calendar} label="Completed" value={String(completedCount)} sub="sessions paid out" />
      </div>

      {/* Chart */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Weekly Earnings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Last 8 weeks · your share after fees</p>
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-accent">
            <ArrowUpRight size={13} /> Growing
          </span>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="35%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="earned" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payout section */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Payout Schedule</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Next Payout</p>
            <p className="text-lg font-bold text-foreground">${nextPayoutAmount}</p>
            <p className="text-[11px] text-primary font-medium mt-0.5">{format(nextPayoutDate, "EEE, MMM d")}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Frequency</p>
            <p className="text-lg font-bold text-foreground">Weekly</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Every Friday</p>
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertCircle size={13} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold">Demo mode:</span> Payouts are simulated. In production, funds are transferred via bank transfer 2–3 business days after each Friday cut-off.
          </p>
        </div>
      </div>

      {/* Performance metrics */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Performance</h2>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Avg hourly rate" value={`$${avgRate}`} sub="per hour billed" />
          <MetricCard label="Sessions / week" value={sessionsPerWeek} sub="rolling average" />
          <MetricCard label="Earn / student" value={`$${earningsPerStudent}`} sub="lifetime average" />
        </div>
      </div>

      {/* Earnings table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">All Sessions</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{allRows.length} total · sorted newest first</p>
        </div>

        {allRows.length === 0 ? (
          <div className="p-8 text-center">
            <DollarSign size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No sessions yet</p>
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-border">
              {allRows.map((s) => {
                const fee = sessionFee(s);
                const tutorEarn = sessionEarnings(s);
                const isFree = (s as any).isCommissionFree;
                const { label, color } = statusLabel(s.status, s.isPaid);
                return (
                  <div key={s.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-foreground">{s.subject}</p>
                          {isFree && <Sparkles size={11} className="text-accent" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{s.studentName} · {s.durationMinutes}m</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {format(parseISO(s.scheduledAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color} shrink-0`}>{label}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Session</p>
                        <p className="text-xs font-semibold text-foreground">${s.totalAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Fee</p>
                        <p className={`text-xs font-semibold ${isFree ? "text-accent" : "text-destructive"}`}>
                          {isFree ? "FREE" : `−$${fee.toFixed(2)}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">You earn</p>
                        <p className="text-xs font-bold text-accent">${tutorEarn.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Session</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fee</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">You earn</th>
                    <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allRows.map((s) => {
                    const fee = sessionFee(s);
                    const tutorEarn = sessionEarnings(s);
                    const isFree = (s as any).isCommissionFree;
                    const { label, color } = statusLabel(s.status, s.isPaid);
                    return (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {format(parseISO(s.scheduledAt), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-foreground">{s.studentName}</p>
                          <p className="text-[11px] text-muted-foreground">{s.subject}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{s.durationMinutes}m</td>
                        <td className="px-4 py-3 text-xs font-medium text-foreground text-right">${s.totalAmount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs font-medium text-right">
                          {isFree ? (
                            <span className="text-accent font-semibold flex items-center justify-end gap-1">
                              <Sparkles size={10} /> FREE
                            </span>
                          ) : (
                            <span className="text-destructive">−${fee.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-accent text-right">${tutorEarn.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-foreground">Totals</td>
                    <td className="px-4 py-3 text-xs font-semibold text-foreground text-right">
                      ${paidCompleted.reduce((s, r) => s + r.totalAmount, 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-destructive text-right">
                      −${paidCompleted.reduce((s, r) => s + sessionFee(r), 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-accent text-right">
                      ${totalEarnings.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
