import { useState } from "react";
import { useListSessions } from "@workspace/api-client-react";
import StatusBadge from "@/components/StatusBadge";
import { Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function AdminSessions() {
  const sessions = useListSessions(undefined);
  const [filter, setFilter] = useState<"all" | "scheduled" | "completed" | "cancelled">("all");

  const filtered = sessions.data
    ?.filter((s) => filter === "all" || s.status === filter)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()) ?? [];

  const totalRevenue = sessions.data
    ?.filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.totalAmount, 0) ?? 0;

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">All Sessions</h1>
        <div className="flex items-center gap-4 mt-0.5">
          <p className="text-sm text-muted-foreground">{sessions.data?.length ?? 0} total</p>
          <p className="text-sm text-accent font-medium">Revenue: ${totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-4 p-1 bg-muted rounded-xl overflow-x-auto">
        {(["all", "scheduled", "completed", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 py-1.5 px-3 rounded-lg text-xs font-medium capitalize transition-all ${
              filter === f ? "bg-card shadow-xs text-foreground" : "text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {sessions.isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <Calendar size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No sessions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((session) => (
            <div key={session.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{session.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {session.tutorName} → {session.studentName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(session.scheduledAt), "EEE, MMM d 'at' h:mm a")} · {session.durationMinutes}min
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge status={session.status} />
                  <span className="text-xs font-semibold text-foreground">${session.totalAmount.toFixed(0)}</span>
                  {session.isPaid && <span className="text-[10px] text-accent font-medium">Paid</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
