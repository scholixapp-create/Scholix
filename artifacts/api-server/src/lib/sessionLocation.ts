type SessionLocationAccess = {
  viewerRole: string;
  viewerId: number;
  tutorUserId: number | null;
  status: string;
  lessonMode: string | null;
  parentAddress: string | null;
  studentActive: boolean;
  parentActive: boolean;
  parentApproved: boolean;
};

/** Reveal a family's address only to its assigned tutor for an active in-person lesson. */
export function visibleSessionLocation(input: SessionLocationAccess): string | null {
  if (input.viewerRole !== "tutor" || input.viewerId !== input.tutorUserId) return null;
  if (!input.studentActive || !input.parentActive || !input.parentApproved) return null;
  if (input.status !== "scheduled" && input.status !== "completed") return null;
  if (input.lessonMode !== "in_person") return null;
  return input.parentAddress?.trim() || null;
}
