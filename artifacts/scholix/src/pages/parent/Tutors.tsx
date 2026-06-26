import { useState } from "react";
import { useListTutors } from "@workspace/api-client-react";
import { Link } from "wouter";
import { GraduationCap, Star, Search, ShieldCheck, Award, Monitor, MapPin, Layers } from "lucide-react";

type ModeFilter = "all" | "online" | "in_person" | "both";

const MODE_LABELS: Record<string, string> = {
  online: "Online",
  in_person: "In-person",
  both: "Both",
};

const MODE_ICONS: Record<string, React.ReactNode> = {
  online: <Monitor size={10} />,
  in_person: <MapPin size={10} />,
  both: <Layers size={10} />,
};

const MODE_COLORS: Record<string, string> = {
  online: "bg-blue-50 text-blue-600 border-blue-200",
  in_person: "bg-emerald-50 text-emerald-600 border-emerald-200",
  both: "bg-violet-50 text-violet-600 border-violet-200",
};

export default function ParentTutors() {
  const tutors = useListTutors();
  const [query, setQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");

  const filtered = (tutors.data ?? []).filter((t) => {
    if (modeFilter !== "all") {
      const mode = t.teachingMode ?? "online";
      if (mode !== modeFilter) return false;
    }
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
      t.subjects.some((s) => s.toLowerCase().includes(q)) ||
      t.bio?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-foreground">Find a Tutor</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Browse WWCC-verified tutors and book a session</p>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or subject…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Mode filter chips */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(["all", "online", "in_person", "both"] as ModeFilter[]).map((m) => (
          <button
            key={m}
            onClick={() => setModeFilter(m)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              modeFilter === m
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
            }`}
          >
            {m !== "all" && MODE_ICONS[m]}
            {m === "all" ? "All modes" : MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {tutors.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <GraduationCap size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No tutors found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {query ? "Try a different search" : "Check back soon as more tutors are approved"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tutor) => {
            const sessionCount = (tutor as { sessionCount?: number }).sessionCount ?? 0;
            const verificationStatus = (tutor as { verificationStatus?: string }).verificationStatus;
            const isVerified = verificationStatus === "approved";
            const initials = `${tutor.firstName[0]}${tutor.lastName[0]}`;

            return (
              <div key={tutor.id} className="bg-card border border-card-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/tutor/${tutor.id}`}
                            className="text-sm font-bold text-foreground hover:text-primary transition-colors hover:underline"
                          >
                            {tutor.firstName} {tutor.lastName}
                          </Link>
                          {isVerified && <ShieldCheck size={13} className="text-accent shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} size={9} className="text-yellow-400 fill-yellow-400" />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">New</span>
                          {sessionCount > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              · <Award size={9} className="text-accent" /> {sessionCount} sessions
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-bold text-foreground">${tutor.hourlyRate}</span>
                        <span className="text-xs text-muted-foreground">/hr</span>
                      </div>
                    </div>

                    {tutor.bio && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{tutor.bio}</p>
                    )}

                    {tutor.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tutor.subjects.slice(0, 4).map((sub) => (
                          <span key={sub} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                            {sub}
                          </span>
                        ))}
                        {tutor.subjects.length > 4 && (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">
                            +{tutor.subjects.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Teaching mode badge */}
                    {(() => {
                      const mode = tutor.teachingMode ?? "online";
                      return (
                        <div className="mt-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${MODE_COLORS[mode] ?? MODE_COLORS.online}`}>
                            {MODE_ICONS[mode]}
                            {MODE_LABELS[mode] ?? mode}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2">
                  <Link
                    href={`/tutor/${tutor.id}`}
                    className="flex items-center justify-center py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    View profile
                  </Link>
                  <Link
                    href={`/parent/book/${tutor.id}`}
                    className="flex items-center justify-center py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Book session
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
