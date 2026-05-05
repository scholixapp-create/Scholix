import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useListStudents } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { BarChart2, BookOpen, TrendingUp, TrendingDown, Minus, FileText, Inbox } from "lucide-react";

interface ProgressEntry {
  id: number;
  sessionId: number;
  score: number;
  notes: string | null;
  createdAt: string;
  subject: string;
  scheduledAt: string;
  durationMinutes: number;
}

function getToken() {
  return localStorage.getItem("scholix_token") ?? "";
}

function scoreColor(score: number) {
  if (score >= 8) return "bg-accent text-white";
  if (score >= 5) return "bg-primary text-white";
  return "bg-amber-500 text-white";
}

function scoreLabel(score: number) {
  if (score >= 8) return "Excelling";
  if (score >= 5) return "Good progress";
  return "Needs support";
}

function scoreBg(score: number) {
  if (score >= 8) return "bg-accent/10";
  if (score >= 5) return "bg-primary/10";
  return "bg-amber-50";
}

function TrendIcon({ entries }: { entries: ProgressEntry[] }) {
  if (entries.length < 2) return <Minus size={14} className="text-muted-foreground" />;
  const recent = entries.slice(-3);
  const avg = recent.reduce((s, e) => s + e.score, 0) / recent.length;
  const older = entries.slice(0, Math.max(1, entries.length - 3));
  const avgOld = older.reduce((s, e) => s + e.score, 0) / older.length;
  if (avg > avgOld + 0.5) return <TrendingUp size={14} className="text-accent" />;
  if (avg < avgOld - 0.5) return <TrendingDown size={14} className="text-amber-500" />;
  return <Minus size={14} className="text-muted-foreground" />;
}

export default function StudentProgress() {
  const { user } = useAuth();
  const allStudents = useListStudents();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const myStudent = allStudents.data?.find((s) => s.userId === user?.id) ?? null;

  useEffect(() => {
    if (!myStudent) return;
    fetch(`/api/students/${myStudent.id}/progress`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setEntries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [myStudent?.id]);

  useEffect(() => {
    if (!allStudents.isLoading && !myStudent) setLoading(false);
  }, [allStudents.isLoading, myStudent]);

  const avgScore = entries.length
    ? entries.reduce((s, e) => s + e.score, 0) / entries.length
    : null;

  const subjectMap: Record<string, ProgressEntry[]> = {};
  entries.forEach((e) => {
    if (!subjectMap[e.subject]) subjectMap[e.subject] = [];
    subjectMap[e.subject].push(e);
  });

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart2 size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">My Progress</h1>
          <p className="text-sm text-muted-foreground">Scores and feedback from your sessions</p>
        </div>
      </div>

      {loading || allStudents.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Inbox size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No progress entries yet</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Your tutor will log progress after each completed session. Check back here after your first session.
          </p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-primary rounded-xl p-3 text-white text-center">
              <p className="text-2xl font-bold">{entries.length}</p>
              <p className="text-[10px] opacity-75 mt-0.5">Sessions logged</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {avgScore !== null ? avgScore.toFixed(1) : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Avg score</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-3 text-center flex flex-col items-center justify-center gap-0.5">
              <TrendIcon entries={entries} />
              <p className="text-[10px] text-muted-foreground">Trend</p>
            </div>
          </div>

          {/* Per-subject averages */}
          {Object.keys(subjectMap).length > 1 && (
            <div className="bg-card border border-card-border rounded-xl p-4 mb-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">By Subject</p>
              <div className="space-y-3">
                {Object.entries(subjectMap).map(([subject, subEntries]) => {
                  const avg = subEntries.reduce((s, e) => s + e.score, 0) / subEntries.length;
                  const pct = (avg / 10) * 100;
                  return (
                    <div key={subject}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{subject}</span>
                        <span className="text-xs text-muted-foreground">{avg.toFixed(1)}/10 · {subEntries.length} session{subEntries.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${avg >= 8 ? "bg-accent" : avg >= 5 ? "bg-primary" : "bg-amber-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Session History</p>
          <div className="space-y-3">
            {[...entries].reverse().map((entry) => (
              <div key={entry.id} className={`rounded-xl p-4 border border-card-border ${scoreBg(entry.score)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center shrink-0">
                      <BookOpen size={15} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{entry.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(parseISO(entry.scheduledAt), "EEE, MMM d yyyy")} · {entry.durationMinutes}min
                      </p>
                      {entry.notes && (
                        <div className="mt-2 flex items-start gap-1.5">
                          <FileText size={11} className="text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground leading-relaxed">{entry.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${scoreColor(entry.score)}`}>
                      {entry.score}/10
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">{scoreLabel(entry.score)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
