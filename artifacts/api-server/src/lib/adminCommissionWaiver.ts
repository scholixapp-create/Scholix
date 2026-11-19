export type CommissionWaiverAction =
  | "commission_waiver_granted"
  | "commission_waiver_revoked";

export type CommissionWaiverActor = {
  id: number;
  role: string;
  isActive: boolean;
};

export type CommissionWaiverTutor = {
  id: number;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isApproved: boolean;
  commissionWaived: boolean;
};

export type CommissionWaiverResult = Omit<
  CommissionWaiverTutor,
  "role" | "isActive" | "isApproved"
> & { commissionWaived: boolean; changed: boolean };

export type CommissionWaiverAudit = {
  actorUserId: number;
  targetUserId: number;
  targetEmail: string;
  action: CommissionWaiverAction;
  reason: string;
};

export interface CommissionWaiverTransaction {
  lockWaiverChanges(): Promise<void>;
  findActor(userId: number): Promise<CommissionWaiverActor | undefined>;
  findTutor(tutorId: number): Promise<CommissionWaiverTutor | undefined>;
  setWaiver(tutorId: number, enabled: boolean): Promise<void>;
  appendAudit(entry: CommissionWaiverAudit): Promise<void>;
}

export interface CommissionWaiverStore {
  transaction<T>(operation: (tx: CommissionWaiverTransaction) => Promise<T>): Promise<T>;
}

export class CommissionWaiverError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = "CommissionWaiverError";
  }
}

export async function changeTutorCommissionWaiver(
  store: CommissionWaiverStore,
  input: {
    actorUserId: number;
    tutorId: number;
    enabled: boolean;
    reason: string;
    confirmationEmail: string;
  },
): Promise<CommissionWaiverResult> {
  const reason = input.reason.trim();
  if (reason.length < 20 || reason.length > 500) {
    throw new CommissionWaiverError("Provide a reason between 20 and 500 characters", 400);
  }

  return store.transaction(async (tx) => {
    await tx.lockWaiverChanges();
    const actor = await tx.findActor(input.actorUserId);
    if (!actor?.isActive || actor.role !== "admin") {
      throw new CommissionWaiverError("Admin access is no longer active", 403);
    }

    const tutor = await tx.findTutor(input.tutorId);
    if (!tutor) throw new CommissionWaiverError("Tutor not found", 404);
    if (tutor.role !== "tutor" || !tutor.isActive || !tutor.isApproved) {
      throw new CommissionWaiverError("Only active, approved tutor accounts can receive a waiver", 409);
    }
    if (input.confirmationEmail.trim().toLowerCase() !== tutor.email.trim().toLowerCase()) {
      throw new CommissionWaiverError("The confirmation email does not match this tutor", 400);
    }

    if (tutor.commissionWaived === input.enabled) {
      return { ...tutor, commissionWaived: input.enabled, changed: false };
    }

    await tx.setWaiver(tutor.id, input.enabled);
    await tx.appendAudit({
      actorUserId: input.actorUserId,
      targetUserId: tutor.userId,
      targetEmail: tutor.email,
      action: input.enabled ? "commission_waiver_granted" : "commission_waiver_revoked",
      reason,
    });
    return { ...tutor, commissionWaived: input.enabled, changed: true };
  });
}
