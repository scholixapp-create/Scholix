import { useEffect, useState } from "react";
import { Link } from "wouter";
import { GraduationCap, Star, Search, BookOpen, ArrowRight, Monitor, MapPin, Layers } from "lucide-react";
import TestModeBanner from "@/components/TestModeBanner";

type ModeFilter = "all" | "online" | "in_person" | "both";

interface PublicTutor {
  id: number;
  firstName: string;
  lastName: string;
  bio: string | null;
  subjects: string[];
  hourlyRate: number;
  teachingMode?: string;
}

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

export default function TutorDirectory() {
  const [tutors, setTutors] = useState<PublicTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");

  useEffect(() => {
    fetch("/api/tutors")
      .then((r) => r.json())
      .then((data) => setTutors(data))
      .catch(() => setTutors([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tutors.filter((t) => {
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
    <>
    <TestModeBanner />
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Header bar */}
      <div className="bg-[#0f2240] py-14 px-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <BookOpen size={14} className="text-white" />
          </div>
          <Link href="/" className="font-bold text-lg text-white tracking-tight">Scholix</Link>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
          Find a Verified Tutor
        </h1>
        <p className="text-white/60 text-sm max-w-md mx-auto mb-8">
          Every tutor on Scholix is WWCC-checked and quality-reviewed. Browse, find the right fit, and sign up to book.
        </p>

        {/* Search */}
        <div className="relative max-w-sm mx-auto mb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search by name or subject…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>

        {/* Mode filter chips */}
        <div className="flex justify-center gap-2 flex-wrap">
          {(["all", "online", "in_person", "both"] as ModeFilter[]).map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                modeFilter === m
                  ? "bg-white text-[#0f2240] border-white"
                  : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white"
              }`}
            >
              {m !== "all" && MODE_ICONS[m]}
              {m === "all" ? "All modes" : MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Tutor grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-white border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap size={40} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              {query ? `No tutors matching "${query}"` : "No tutors available yet"}
            </p>
            {query && (
              <button onClick={() => setQuery("")} className="mt-2 text-sm text-primary hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-5">
              {filtered.length} tutor{filtered.length !== 1 ? "s" : ""} available
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((tutor) => (
                <div
                  key={tutor.id}
                  className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Avatar */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                      {tutor.firstName[0]}{tutor.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/tutor/${tutor.id}`}
                        className="text-sm font-bold text-[#0f2240] truncate hover:text-primary transition-colors hover:underline block"
                      >
                        {tutor.firstName} {tutor.lastName}
                      </Link>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={10} className="fill-amber-400 text-amber-400" />
                        ))}
                        <span className="text-[10px] text-gray-400 ml-0.5">Verified</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base font-bold text-[#0f2240]">${tutor.hourlyRate}</span>
                      <span className="text-xs text-gray-400">/hr</span>
                    </div>
                  </div>

                  {/* Subjects */}
                  {tutor.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tutor.subjects.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-full bg-primary/8 text-primary text-[11px] font-medium"
                        >
                          {s}
                        </span>
                      ))}
                      {tutor.subjects.length > 4 && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[11px]">
                          +{tutor.subjects.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Teaching mode badge */}
                  {(() => {
                    const mode = tutor.teachingMode ?? "online";
                    return (
                      <div className="mb-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${MODE_COLORS[mode] ?? MODE_COLORS.online}`}>
                          {MODE_ICONS[mode]}
                          {MODE_LABELS[mode] ?? mode}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Bio */}
                  {tutor.bio && (
                    <p className="text-xs text-gray-500 leading-relaxed flex-1 line-clamp-2 mb-4">
                      {tutor.bio}
                    </p>
                  )}

                  <div className="mt-auto pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                    <Link
                      href={`/tutor/${tutor.id}`}
                      className="flex items-center justify-center py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:border-primary/40 hover:text-primary transition-colors"
                    >
                      View profile
                    </Link>
                    <Link
                      href="/signup"
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      Sign up to book
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Bottom CTA */}
        <div className="mt-14 text-center">
          <p className="text-gray-500 text-sm mb-4">Are you a tutor? Join Scholix and start earning.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0f2240] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Start tutoring free
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
