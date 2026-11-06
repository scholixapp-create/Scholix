import { Link } from "wouter";
import { Info, MapPin, Monitor } from "lucide-react";

type SessionContextProps = {
  sessionId: number;
  studentId: number;
  studentName?: string | null;
  lessonMode: string | null;
  locationAddress?: string | null;
  status?: string;
  compact?: boolean;
};

export function SessionStudentLink({ studentId, studentName }: Pick<SessionContextProps, "studentId" | "studentName">) {
  const name = studentName ?? "Student";
  return (
    <Link
      href={`/tutor/students?student=${encodeURIComponent(studentId)}`}
      aria-label={`View ${name}'s profile and progress`}
      className="inline-flex rounded-sm underline decoration-primary/30 underline-offset-2 hover:text-primary hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid={`link-session-student-${studentId}`}
    >
      {name}
    </Link>
  );
}

export function SessionModeLocation({
  sessionId,
  studentId,
  studentName,
  lessonMode,
  locationAddress,
  status,
  compact = false,
}: SessionContextProps) {
  const onlineTipId = `online-tip-${sessionId}`;
  const textClass = compact ? "text-[11px]" : "text-xs";

  if (lessonMode === "online") {
    return (
      <details className="group relative inline-block">
        <summary
          className={`inline-flex list-none cursor-pointer items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-1 font-medium text-sky-800 [&::-webkit-details-marker]:hidden ${textClass}`}
          aria-describedby={onlineTipId}
          data-testid={`badge-online-${sessionId}`}
        >
          <Monitor size={12} aria-hidden="true" />
          Online
          <Info size={11} aria-hidden="true" />
        </summary>
        <span
          id={onlineTipId}
          role="tooltip"
          className="invisible absolute left-0 top-full z-40 mt-2 w-64 rounded-lg bg-[#0f2747] p-3 text-xs font-normal leading-relaxed text-white opacity-0 shadow-xl group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 group-open:visible group-open:opacity-100"
        >
          Prepare early: schedule this lesson in Zoom or your online service, then email the joining link to {studentName ?? "the student"} as soon as possible.
        </span>
      </details>
    );
  }

  if (lessonMode === "in_person") {
    return (
      <div className="min-w-0" data-testid={`location-in-person-${studentId}`}>
        <span className={`inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-800 ${textClass}`}>
          <MapPin size={12} aria-hidden="true" />
          In-person
        </span>
        <p className={`${textClass} mt-1 text-muted-foreground break-words`}>
          {locationAddress || "Confirm the lesson address with the parent"}
        </p>
      </div>
    );
  }

  return (
    <span className={`rounded-full bg-muted px-2 py-1 font-medium text-muted-foreground ${textClass}`} data-testid={`badge-mode-unknown-${studentId}`}>
      Lesson mode not recorded
    </span>
  );
}
