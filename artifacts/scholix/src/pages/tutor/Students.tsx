import { useAuth } from "@/context/AuthContext";
import { useListTutors, useGetTutorStudents, useListSessions } from "@workspace/api-client-react";
import { Users, GraduationCap, BookOpen, Target } from "lucide-react";
import { format, parseISO } from "date-fns";
import StatusBadge from "@/components/StatusBadge";

export default function TutorStudents() {
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

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">My Students</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {students.data?.length ?? 0} student{students.data?.length !== 1 ? "s" : ""} in your practice
        </p>
      </div>

      {students.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : students.data?.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <Users size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No students yet</p>
          <p className="text-xs text-muted-foreground mt-1">Students will appear here once you have sessions booked</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.data?.map((student) => {
            const s = student as any;
            const studentSessions = sessions.data?.filter((sess) => sess.studentId === student.id) ?? [];
            const lastSession = studentSessions
              .filter((sess) => sess.status === "completed")
              .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];
            const nextSession = studentSessions
              .filter((sess) => sess.status === "scheduled")
              .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

            const displayName = s.lastName
              ? `${s.firstName} ${s.lastName}`
              : s.firstName;
            const initials = s.lastName
              ? `${s.firstName[0]}${s.lastName[0]}`.toUpperCase()
              : s.firstName.slice(0, 2).toUpperCase();
            const subjectList = s.subjects
              ? s.subjects.split(",").map((sub: string) => sub.trim()).filter(Boolean)
              : [];

            return (
              <div key={student.id} className="bg-card border border-card-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{displayName}</p>
                    {s.yearLevel && (
                      <span className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                        {s.yearLevel}
                      </span>
                    )}
                    {s.school && (
                      <p className="text-xs text-muted-foreground mt-1">{s.school}</p>
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

                    {s.goals && (
                      <div className="flex items-start gap-1.5 mt-2">
                        <Target size={11} className="text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{s.goals}</p>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
