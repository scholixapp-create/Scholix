export type AdminUserDeletionRecord = {
  id: number;
  email: string;
  role: string;
  isActive: boolean;
};

export interface AdminUserDeletionTransaction {
  lockStatusChanges(): Promise<void>;
  findUser(userId: number): Promise<AdminUserDeletionRecord | undefined>;
  countActiveAdmins(): Promise<number>;
  findDeletionBlockers(userId: number): Promise<string[]>;
  deleteAccount(userId: number): Promise<void>;
  appendDeletionAudit(entry: {
    actorUserId: number;
    targetUserId: number;
    targetEmail: string;
  }): Promise<void>;
}

export interface AdminUserDeletionStore {
  transaction<T>(operation: (tx: AdminUserDeletionTransaction) => Promise<T>): Promise<T>;
}

export class AdminUserDeletionError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 403 | 404 | 409,
  ) {
    super(message);
    this.name = "AdminUserDeletionError";
  }
}

export async function deleteAdminUser(
  store: AdminUserDeletionStore,
  actorUserId: number,
  targetUserId: number,
): Promise<void> {
  await store.transaction(async (tx) => {
    // This is the same transaction-scoped lock used by activation changes.
    await tx.lockStatusChanges();

    const actor = await tx.findUser(actorUserId);
    if (!actor?.isActive || actor.role !== "admin") {
      throw new AdminUserDeletionError("Admin access required", 403);
    }
    if (actorUserId === targetUserId) {
      throw new AdminUserDeletionError("You cannot delete your own account", 400);
    }

    const target = await tx.findUser(targetUserId);
    if (!target) {
      throw new AdminUserDeletionError("User not found", 404);
    }
    if (
      target.role === "admin"
      && target.isActive
      && await tx.countActiveAdmins() <= 1
    ) {
      throw new AdminUserDeletionError(
        "Cannot delete the last active administrator",
        409,
      );
    }

    const blockers = await tx.findDeletionBlockers(targetUserId);
    if (blockers.length > 0) {
      throw new AdminUserDeletionError(
        `This account can't be permanently deleted because it has ${blockers.join(", ")}. Deactivate it instead.`,
        409,
      );
    }

    await tx.deleteAccount(targetUserId);
    await tx.appendDeletionAudit({
      actorUserId,
      targetUserId,
      targetEmail: target.email,
    });
  });
}
