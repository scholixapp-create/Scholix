import { useGetAdminStats } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Users, GraduationCap, Calendar, DollarSign, CheckCircle, Gift, TrendingUp, Star, Award, Zap } from "lucide-react";

function getToken() {
  return localStorage.getItem("scholix_token") ?? "";
}

interface CommissionStats {
  totalFreeSessionsGranted: number;
  firstStudentFreeCount: number;
  firstSessionFreeCount: number;
  tierBreakdown: { standard: number; growth: number; established: number; expert: number };
  totalPlatformEarned: number;
  totalWaived: number;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={14} className="text-white" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

const tiers = [
  { key: "standard", label: "Starter", range: "0–9 sessions", rate: "30%", color: "bg-slate-400", icon: Star },
  { key: "growth", label: "Growth", range: "10–24 sessions", rate: "25%", color: "bg-blue-500", icon: TrendingUp },
  { key: "established", label: "Established", range: "25–49 sessions", rate: "20%", color: "bg-accent", icon: Award },
  { key: "expert", label: "Expert", range: "50+ sessions", rate: "15%", color: "bg-amber-500", icon: Zap },
];

export default function AdminDashboard() {
  const stats = useGetAdminStats();
  const s = stats.data;

  const [commStats, setCommStats] = useState<CommissionStats | null>(null);
  const [commLoading, setCommLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/commission-stats", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data) => { setCommStats(data); setCommLoading(false); })
      .catch(() => setCommLoading(false));
  }, []);

  const tierTotal = commStats
    ? Object.values(commStats.tierBreakdown).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Scholix admin dashboard</p>
      </div>

      {stats.isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="Total Users" value={s?.totalUsers ?? 0} icon={Users} color="bg-primary" />
            <StatCard label="Tutors" value={`${s?.approvedTutors ?? 0}/${s?.totalTutors ?? 0}`} icon={GraduationCap} color="bg-blue-500" />
            <StatCard label="Total Sessions" value={s?.totalSessions ?? 0} icon={Calendar} color="bg-purple-500" />
            <StatCard label="Completed" value={s?.completedSessions ?? 0} icon={CheckCircle} color="bg-accent" />
          </div>

          <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Revenue</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-accent" />
                  <span className="text-sm text-muted-foreground">Total platform revenue</span>
                </div>
                <span className="text-base font-bold text-foreground">${(s?.totalRevenue ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-primary" />
                  <span className="text-sm text-muted-foreground">Platform commission earned</span>
                </div>
                <span className="text-base font-bold text-primary">${(s?.platformCommission ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Tutor payouts</span>
                <span className="text-base font-semibold text-foreground">
                  ${((s?.totalRevenue ?? 0) - (s?.platformCommission ?? 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Session breakdown</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: s?.totalSessions ? `${(s.completedSessions / s.totalSessions) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-20 text-right">{s?.completedSessions} completed</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: s?.totalSessions ? `${(s.scheduledSessions / s.totalSessions) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-20 text-right">{s?.scheduledSessions} scheduled</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Commission Stats Panel */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-bold text-foreground">Commission Analytics</h2>
        </div>

        {commLoading ? (
          <div className="space-y-3">
            <div className="h-28 rounded-xl bg-muted animate-pulse" />
            <div className="h-40 rounded-xl bg-muted animate-pulse" />
          </div>
        ) : commStats ? (
          <div className="space-y-3">
            {/* Free sessions summary */}
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Gift size={15} className="text-accent" />
                <p className="text-sm font-semibold text-foreground">Free Sessions Granted</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent">{commStats.totalFreeSessionsGranted}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Total free</p>
                </div>
                <div className="text-center border-x border-accent/15">
                  <p className="text-2xl font-bold text-foreground">{commStats.firstStudentFreeCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">First student</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{commStats.firstSessionFreeCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">First session</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-accent/15 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Commission waived (incentive cost)</span>
                <span className="text-sm font-bold text-amber-600">${commStats.totalWaived.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">Commission earned (paid sessions)</span>
                <span className="text-sm font-bold text-accent">${commStats.totalPlatformEarned.toFixed(2)}</span>
              </div>
            </div>

            {/* Tier breakdown chart */}
            <div className="bg-card border border-card-border rounded-xl p-4">
              <p className="text-sm font-semibold text-foreground mb-4">Tutor Tier Distribution</p>
              <div className="space-y-3">
                {tiers.map(({ key, label, range, rate, color, icon: Icon }) => {
                  const count = commStats.tierBreakdown[key as keyof typeof commStats.tierBreakdown];
                  const pct = tierTotal > 0 ? (count / tierTotal) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${color}`}>
                            <Icon size={10} className="text-white" />
                          </div>
                          <span className="text-xs font-medium text-foreground">{label}</span>
                          <span className="text-[10px] text-muted-foreground">{range}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">{rate} fee</span>
                          <span className="text-xs font-bold text-foreground w-4 text-right">{count}</span>
                        </div>
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {tierTotal === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-3">No paid sessions recorded yet</p>
              )}
            </div>

            {/* Revenue waived vs earned bar */}
            {(commStats.totalPlatformEarned + commStats.totalWaived) > 0 && (
              <div className="bg-card border border-card-border rounded-xl p-4">
                <p className="text-sm font-semibold text-foreground mb-3">Revenue Efficiency</p>
                <div className="flex rounded-full overflow-hidden h-4 mb-2">
                  {commStats.totalPlatformEarned > 0 && (
                    <div
                      className="bg-accent h-full"
                      style={{ width: `${(commStats.totalPlatformEarned / (commStats.totalPlatformEarned + commStats.totalWaived)) * 100}%` }}
                    />
                  )}
                  {commStats.totalWaived > 0 && (
                    <div
                      className="bg-amber-400 h-full"
                      style={{ width: `${(commStats.totalWaived / (commStats.totalPlatformEarned + commStats.totalWaived)) * 100}%` }}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-accent" />
                    <span className="text-muted-foreground">Earned ${commStats.totalPlatformEarned.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                    <span className="text-muted-foreground">Waived ${commStats.totalWaived.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Could not load commission stats</p>
        )}
      </div>
    </div>
  );
}
