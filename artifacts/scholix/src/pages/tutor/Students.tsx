import { useAuth } from "@/context/AuthContext";
import { useListTutors, useGetTutorStudents, useListSessions } from "@workspace/api-client-react";
import { Users, GraduationCap } from "lucide-react";
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
            const studentSessions = sessions.data?.filter((s) => s.studentId === student.id) ?? [];
            const lastSession = studentSessions
              .filter((s) => s.status === "completed")
              .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];
            const nextSession = studentSessions
              .filter((s) => s.status === "scheduled")
              .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

            return (
              <div key={student.id} className="bg-card border border-card-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{student.firstName} {student.lastName}</p>
                    {student.gradeLevel && (
                      <p className="text-xs text-muted-foreground mt-0.5">{student.gradeLevel}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{student.email}</p>

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {studentSessions.length} session{studentSessions.length !== 1 ? "s" : ""}
                      </span>
                      {nextSession && (
                        <span className="text-xs text-primary font-medium">
                          Next: {format(parseISO(nextSession.scheduledAt), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {studentSessions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Session history</p>
                    <div className="space-y-1.5">
                      {studentSessions.slice(0, 3).map((s) => (
                        <div key={s.id} className="flex items-center justify-between">
                          <span className="text-xs text-foreground">{s.subject} · {format(parseISO(s.scheduledAt), "MMM d")}</span>
                          <StatusBadge status={s.status} />
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
