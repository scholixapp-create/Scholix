type SessionLocationAccess = {
  viewerRole: string;
  viewerId: number;
  tutorUserId: number | null;
  status: string;
  lessonMode: string | null;
  lessonAddress: string | null;
  studentActive: boolean;
  parentActive: boolean;
  parentApproved: boolean;
};

/** Reveal a student's lesson address only to the assigned tutor during an active in-person booking. */
export function visibleSessionLocation(input: SessionLocationAccess): string | null {
  if (input.viewerRole !== "tutor" || input.viewerId !== input.tutorUserId) return null;
  if (!input.studentActive || !input.parentActive || !input.parentApproved) return null;
  if (!["pending_payment", "pending_confirmation", "scheduled"].includes(input.status)) return null;
  if (input.lessonMode !== "in_person") return null;
  return input.lessonAddress?.trim() || null;
}
