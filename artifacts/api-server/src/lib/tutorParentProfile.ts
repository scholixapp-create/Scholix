type ParentProfileAccessInput = {
  actorRole: string;
  actorUserId: number;
  tutorUserId: number;
  parentRole: string;
  parentActive: boolean;
  parentArchivedAt: Date | null;
  parentApproved: boolean;
  hasTutorHistory: boolean;
};

export function canTutorViewParentProfile(input: ParentProfileAccessInput): boolean {
  return input.actorRole === "tutor"
    && input.actorUserId === input.tutorUserId
    && input.parentRole === "parent"
    && input.parentActive
    && input.parentArchivedAt === null
    && input.parentApproved
    && input.hasTutorHistory;
}
