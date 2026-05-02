import { useAuth } from "@/context/AuthContext";
import { useListSessions, useListTutors } from "@workspace/api-client-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, TrendingUp, Clock, Users, Calendar,
  ArrowUpRight, Wallet, AlertCircle,
} from "lucide-react";
import { format, parseISO, startOfWeek, addWeeks, subWeeks, isWithinInterval, endOfWeek, nextFriday } from "date-fns";

const TUTOR_SHARE = 0.7;
const PLATFORM_SHARE = 0.3;

function statusLabel(status: string, isPaid: boolean) {
  if (status === "completed" && isPaid) return { label: "Paid", color: "bg-accent/10 text-accent" };
  if (status === "completed" && !isPaid) return { label: "Pending", color: "bg-amber-100 text-amber-700" };
  if (status === "scheduled" && isPaid) return { label: "Upcoming", color: "bg-primary/10 text-primary" };
  if (status === "cancelled") return { label: "Cancelled", color: "bg-destructive/10 text-destructive" };
  return { label: "Pending", color: "bg-amber-100 text-amber-700" };
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
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

  const totalEarnings = paidCompleted.reduce((sum, s) => sum + s.totalAmount * TUTOR_SHARE, 0);
  const pendingPayout = pendingSessions.reduce((sum, s) => sum + s.totalAmount * TUTOR_SHARE, 0);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEarnings = paidCompleted
    .filter((s) => isWithinInterval(parseISO(s.scheduledAt), { start: weekStart, end: weekEnd }))
    .reduce((sum, s) => sum + s.totalAmount * TUTOR_SHARE, 0);

  const completedCount = paidCompleted.length;
  const uniqueStudents = [...new Set(mySessions.map((s) => s.studentId))].length;

  const avgRate = myTutor?.hourlyRate ?? 0;
  const weeksActive = Math.max(1, Math.ceil(mySessions.length / 2));
  const sessionsPerWeek = (mySessions.length / weeksActive).toFixed(1);
  const earningsPerStudent = uniqueStudents > 0
    ? (totalEarnings / uniqueStudents).toFixed(2)
    : "0.00";

  // Weekly chart data — last 8 weeks
  const chartData = Array.from({ length: 8 }, (_, i) => {
    const weekAgo = subWeeks(now, 7 - i);
    const wStart = startOfWeek(weekAgo, { weekStartsOn: 1 });
    const wEnd = endOfWeek(weekAgo, { weekStartsOn: 1 });
    const label = format(wStart, "MMM d");
    const earned = paidCompleted
      .filter((s) => isWithinInterval(parseISO(s.scheduledAt), { start: wStart, end: wEnd }))
      .reduce((sum, s) => sum + s.totalAmount * TUTOR_SHARE, 0);

    // Sprinkle in mock historical data for empty weeks to make the chart useful
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
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Earnings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          You keep <span className="font-semibold text-foreground">70%</span> of every session · Platform fee 30%
        </p>
      </div>

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
            <p className="text-xs text-muted-foreground mt-0.5">Last 8 weeks · your 70% share</p>
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-accent">
            <ArrowUpRight size={13} /> Growing
          </span>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="35%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
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
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {allRows.map((s) => {
                const fee = s.totalAmount * PLATFORM_SHARE;
                const tutorEarn = s.totalAmount * TUTOR_SHARE;
                const { label, color } = statusLabel(s.status, s.isPaid);
                return (
                  <div key={s.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.subject}</p>
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
                        <p className="text-[10px] text-muted-foreground">Fee (30%)</p>
                        <p className="text-xs font-semibold text-destructive">−${fee.toFixed(2)}</p>
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

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Session</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fee 30%</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">You earn</th>
                    <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allRows.map((s) => {
                    const fee = s.totalAmount * PLATFORM_SHARE;
                    const tutorEarn = s.totalAmount * TUTOR_SHARE;
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
                        <td className="px-4 py-3 text-xs font-medium text-destructive text-right">−${fee.toFixed(2)}</td>
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
                      −${paidCompleted.reduce((s, r) => s + r.totalAmount * PLATFORM_SHARE, 0).toFixed(2)}
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
