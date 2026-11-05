export class EducationError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export type EducationState = {
  id: number;
  userId: number;
  educationDetails: string | null;
  pendingEducationDetails: string | null;
  educationReviewStatus: string;
  educationReviewNotes: string | null;
  educationSubmittedAt: Date | null;
};

export function serializeEducation(tutor: EducationState) {
  return {
    tutorId: tutor.id,
    educationDetails: tutor.educationDetails,
    pendingEducationDetails: tutor.pendingEducationDetails,
    educationReviewStatus: tutor.educationReviewStatus,
    educationReviewNotes: tutor.educationReviewNotes,
    educationSubmittedAt: tutor.educationSubmittedAt?.toISOString() ?? null,
  };
}

export function educationProposal(details: unknown, previousDate: Date | null, now = new Date()) {
  if (typeof details !== "string" || !details.trim() || details.length > 5000) {
    throw new EducationError("Provide qualifications between 1 and 5,000 characters", 400);
  }
  return {
    pendingEducationDetails: details.trim(),
    educationReviewStatus: "pending",
    educationReviewNotes: null,
    // Distinct revision markers even for two submissions in the same millisecond.
    educationSubmittedAt: new Date(Math.max(now.getTime(), (previousDate?.getTime() ?? 0) + 1)),
  };
}

export function educationDecision(
  tutor: EducationState,
  decision: { action: "approve" | "reject"; expectedSubmittedAt: string | Date; notes?: string },
) {
  if (
    tutor.educationReviewStatus !== "pending" || !tutor.pendingEducationDetails ||
    tutor.educationSubmittedAt?.getTime() !== new Date(decision.expectedSubmittedAt).getTime()
  ) {
    throw new EducationError("This proposal changed or has already been reviewed. Refresh before deciding.", 409);
  }
  return {
    ...(decision.action === "approve" ? {
      educationDetails: tutor.pendingEducationDetails,
      pendingEducationDetails: null,
    } : {}),
    educationReviewStatus: decision.action === "approve" ? "approved" : "rejected",
    educationReviewNotes: decision.notes?.trim() || null,
  };
}
