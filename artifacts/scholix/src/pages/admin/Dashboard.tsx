import { useGetAdminStats } from "@workspace/api-client-react";
import { Users, GraduationCap, Calendar, DollarSign, CheckCircle, Clock } from "lucide-react";

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

export default function AdminDashboard() {
  const stats = useGetAdminStats();
  const s = stats.data;

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
                  <span className="text-sm text-muted-foreground">Platform commission (30%)</span>
                </div>
                <span className="text-base font-bold text-primary">${(s?.platformCommission ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Tutor payouts (70%)</span>
                <span className="text-base font-semibold text-foreground">
                  ${((s?.totalRevenue ?? 0) - (s?.platformCommission ?? 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-4">
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
    </div>
  );
}
