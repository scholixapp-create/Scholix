import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useListTutors, useGetTutorStudents, useListSessions, useGetTutorRelationships, useUpsertTutorRelationship } from "@workspace/api-client-react";
import { getGetTutorRelationshipsQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, GraduationCap, BookOpen, Target, Settings2, Check, ChevronDown, ChevronUp, CalendarPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import StatusBadge from "@/components/StatusBadge";
import { SessionModeLocation } from "@/components/tutor/SessionContext";
import OfferLessonTimeDialog from "@/components/tutor/OfferLessonTimeDialog";

type LessonModeOverride = "online" | "in_person" | null;

interface ProgressEntry {
  id: number;
  sessionId: number;
  score: number;
  notes: string | null;
  subject: string;
  scheduledAt: string;
}

function StudentProgressHistory({ studentId, initiallyOpen = false }: { studentId: number; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  useEffect(() => setOpen(initiallyOpen), [initiallyOpen]);
  const progress = useQuery<ProgressEntry[]>({
    queryKey: ["tutor", "student-progress", studentId],
    enabled: open,
    queryFn: async () => {
      const response = await fetch(`/api/students/${studentId}/progress`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("scholix_token") ?? ""}` },
      });
      if (!response.ok) throw new Error("Could not load progress history");
      return response.json();
    },
  });

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
        aria-expanded={open}
      >
        <GraduationCap size={12} />
        Progress history
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {open && (
        <div className="mt-3">
          {progress.isLoading ? (
            <div className="h-16 rounded-lg bg-muted animate-pulse" />
          ) : progress.isError ? (
            <p className="text-xs text-destructive">Progress history could not be loaded.</p>
          ) : progress.data?.length === 0 ? (
            <p className="text-xs text-muted-foreground">No progress notes have been recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {[...(progress.data ?? [])].reverse().map((entry) => (
                <div key={entry.id} className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-foreground">{entry.subject}</p>
                    <span className="text-[10px] text-muted-foreground">{format(parseISO(entry.scheduledAt), "MMM d, yyyy")}</span>
                  </div>
                  <p className="text-[11px] font-medium text-primary mt-1">Progress score: {entry.score}/10</p>
                  {entry.notes && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{entry.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PrefEditorProps {
  tutorId: number;
  parentId: number;
  currentMode: LessonModeOverride;
  currentBuffer: number | null;
}

function PrefEditor({ tutorId, parentId, currentMode, currentBuffer }: PrefEditorProps) {
  const qc = useQueryClient();
  const upsert = useUpsertTutorRelationship();

  const [mode, setMode] = useState<LessonModeOverride>(currentMode);
  const [buffer, setBuffer] = useState<string>(currentBuffer !== null ? String(currentBuffer) : "");
  const [saved, setSaved] = useState(false);

  const isDirty = mode !== currentMode || (buffer === "" ? null : Number(buffer)) !== currentBuffer;

  const handleSave = () => {
    const bufferVal = buffer === "" ? null : Number(buffer);
    upsert.mutate(
      {
        tutorId,
        parentId,
        data: { lessonMode: mode ?? undefined, travelBufferMinutes: bufferVal ?? undefined },
      },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          qc.invalidateQueries({ queryKey: getGetTutorRelationshipsQueryKey(tutorId) });
        },
      }
    );
  };

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
        <Settings2 size={11} />
        Lesson preferences for this family
      </p>

      <div className="space-y-2">
        <div>
          <p className="text-[10px] text-muted-foreground mb-1 font-medium">Lesson mode</p>
          <div className="flex gap-1.5">
            {([null, "online", "in_person"] as LessonModeOverride[]).map((m) => (
              <button
                key={String(m)}
                onClick={() => { setMode(m); setSaved(false); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                  mode === m
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {m === null ? "Default" : m === "online" ? "Online" : "In-person"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground mb-1 font-medium">
            Travel buffer override <span className="font-normal">(mins, leave empty for default)</span>
          </p>
          <input
            type="number"
            min={0}
            max={120}
            value={buffer}
            onChange={(e) => { setBuffer(e.target.value); setSaved(false); }}
            placeholder="Default"
            className="w-24 px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!isDirty || upsert.isPending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            saved
              ? "bg-accent/10 text-accent border border-accent/30"
              : isDirty
                ? "bg-primary text-white hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-default"
          } disabled:opacity-60`}
        >
          {saved ? (
            <><Check size={11} /> Saved</>
          ) : upsert.isPending ? (
            "Saving…"
          ) : (
            "Save preferences"
          )}
        </button>
      </div>
    </div>
  );
}

export default function TutorStudents() {
  const search = useSearch();
  const requestedStudent = new URLSearchParams(search).get("student");
  const selectedStudentId = requestedStudent && /^[1-9]\d*$/.test(requestedStudent)
    ? Number(requestedStudent)
    : null;
  const { user } = useAuth();
  const tutors = useListTutors();
  const tutorProfile = tutors.data?.find((t) => t.userId === user?.id);
  const tutorId = tutorProfile?.id;

  const students = useGetTutorStudents(tutorId ?? 0, {
    query: { enabled: !!tutorId } as any,
  });

  const sessions = useListSessions(tutorId ? { tutorId } : undefined, {
    query: { enabled: !!tutorId } as any,
  });

  const relationships = useGetTutorRelationships(tutorId ?? 0, {
    query: { enabled: !!tutorId } as any,
  });

  const [expandedPrefs, setExpandedPrefs] = useState<Set<number>>(new Set());
  const [offeringStudentId, setOfferingStudentId] = useState<number | null>(null);

  const togglePrefs = (parentId: number) => {
    setExpandedPrefs((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6">
        {selectedStudentId && (
          <Link href="/tutor/students" className="mb-2 inline-flex text-xs font-medium text-primary hover:underline">
            ← All students
          </Link>
        )}
        <h1 className="text-xl font-bold text-foreground">{selectedStudentId ? "Student profile" : "My Students"}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {selectedStudentId
            ? "Profile, learning goals, and progress from your sessions"
            : `${students.data?.length ?? 0} student${students.data?.length !== 1 ? "s" : ""} in your practice`}
        </p>
      </div>

      {students.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (students.data?.filter((student) => selectedStudentId === null || student.id === selectedStudentId).length ?? 0) === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <Users size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">{selectedStudentId ? "Student profile unavailable" : "No students yet"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedStudentId ? "This profile is only available to tutors with sessions for this student." : "Students will appear here once you have sessions booked."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.data?.filter((student) => selectedStudentId === null || student.id === selectedStudentId).map((student) => {
            const studentSessions = sessions.data?.filter((sess) => sess.studentId === student.id) ?? [];
            const lastSession = studentSessions
              .filter((sess) => sess.status === "completed")
              .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];
            const nextSession = studentSessions
              .filter((sess) => sess.status === "scheduled")
              .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

            const displayName = student.lastName
              ? `${student.firstName} ${student.lastName}`
              : student.firstName;
            const initials = student.lastName
              ? `${student.firstName[0]}${student.lastName[0]}`.toUpperCase()
              : student.firstName.slice(0, 2).toUpperCase();
            const subjectList = student.subjects
              ? student.subjects.split(",").map((sub) => sub.trim()).filter(Boolean)
              : [];

            const parentId: number | null = student.parentId ?? null;
            const rel = parentId
              ? relationships.data?.find((r) => r.parentId === parentId)
              : null;
            const prefsOpen = parentId ? expandedPrefs.has(parentId) : false;

            return (
              <div key={`${student.id}-${selectedStudentId ?? "list"}`} className="bg-card border border-card-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{displayName}</p>
                    {student.yearLevel && (
                      <span className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                        {student.yearLevel}
                      </span>
                    )}
                    {student.school && (
                      <p className="text-xs text-muted-foreground mt-1">{student.school}</p>
                    )}

                    {subjectList.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {subjectList.map((sub: string) => (
                          <span key={sub} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-medium">
                            <BookOpen size={9} />
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}

                    {student.goals && (
                      <div className="flex items-start gap-1.5 mt-2">
                        <Target size={11} className="text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{student.goals}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {studentSessions.length} session{studentSessions.length !== 1 ? "s" : ""}
                      </span>
                      {nextSession && (
                        <span className="text-xs text-primary font-medium">
                          Next: {format(parseISO(nextSession.scheduledAt), "MMM d")}
                        </span>
                      )}
                      {!nextSession && lastSession && (
                        <span className="text-xs text-muted-foreground">
                          Last: {format(parseISO(lastSession.scheduledAt), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {studentSessions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Session history</p>
                    <div className="space-y-1.5">
                      {studentSessions.slice(0, 3).map((sess) => (
                        <div key={sess.id} className="flex items-center justify-between">
                          <span className="text-xs text-foreground">{sess.subject} · {format(parseISO(sess.scheduledAt), "MMM d")}</span>
                          <StatusBadge status={sess.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {nextSession && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Next session</p>
                    <SessionModeLocation
                      sessionId={nextSession.id}
                      studentId={student.id}
                      studentName={displayName}
                      lessonMode={nextSession.lessonMode ?? null}
                      locationAddress={nextSession.locationAddress}
                      status={nextSession.status}
                    />
                  </div>
                )}

                <StudentProgressHistory studentId={student.id} initiallyOpen={selectedStudentId === student.id} />

                {parentId && tutorId && tutorProfile && (
                  <>
                    <button
                      type="button"
                      onClick={() => setOfferingStudentId(student.id)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                    >
                      <CalendarPlus size={13} /> Offer a lesson time
                    </button>
                    <OfferLessonTimeDialog
                      open={offeringStudentId === student.id}
                      onClose={() => setOfferingStudentId(null)}
                      tutorId={tutorId}
                      studentId={student.id}
                      studentName={displayName}
                      subjects={tutorProfile.subjects ?? []}
                      durations={tutorProfile.sessionDurations ?? [60, 90]}
                      teachingMode={tutorProfile.teachingMode ?? "online"}
                      preferredMode={rel?.lessonMode === "online" || rel?.lessonMode === "in_person" ? rel.lessonMode : null}
                    />
                  </>
                )}

                {parentId && tutorId && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => togglePrefs(parentId)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Settings2 size={11} />
                      Lesson preferences
                      {rel?.lessonMode && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">
                          {rel.lessonMode === "online" ? "Online" : "In-person"}
                        </span>
                      )}
                      {rel?.travelBufferMinutes !== null && rel?.travelBufferMinutes !== undefined && (
                        <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">
                          {rel.travelBufferMinutes}min buffer
                        </span>
                      )}
                      {prefsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>

                    {prefsOpen && (
                      <PrefEditor
                        tutorId={tutorId}
                        parentId={parentId}
                        currentMode={(rel?.lessonMode as LessonModeOverride) ?? null}
                        currentBuffer={rel?.travelBufferMinutes ?? null}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
