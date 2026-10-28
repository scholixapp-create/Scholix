export type AdminUserStatusRecord = {
  id: number;
  role: string;
  isActive: boolean;
};

export type AdminUserStatusAction = "deactivated" | "reactivated";

export interface AdminUserStatusTransaction {
  lockStatusChanges(): Promise<void>;
  findUser(userId: number): Promise<AdminUserStatusRecord | undefined>;
  countActiveAdmins(): Promise<number>;
  setUserActive(userId: number, isActive: boolean): Promise<void>;
  appendAudit(action: {
    actorUserId: number;
    targetUserId: number;
    action: AdminUserStatusAction;
  }): Promise<void>;
}

export interface AdminUserStatusStore {
  transaction<T>(operation: (tx: AdminUserStatusTransaction) => Promise<T>): Promise<T>;
}

export class AdminUserStatusError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 403 | 404 | 409,
  ) {
    super(message);
    this.name = "AdminUserStatusError";
  }
}

export async function changeAdminUserStatus(
  store: AdminUserStatusStore,
  actorUserId: number,
  targetUserId: number,
  isActive: boolean,
): Promise<AdminUserStatusRecord> {
  return store.transaction(async (tx) => {
    // The store holds a PostgreSQL transaction-scoped lock here. Every status
    // change uses it so concurrent admin changes cannot remove the last admin.
    await tx.lockStatusChanges();

    const actor = await tx.findUser(actorUserId);
    if (!actor?.isActive || actor.role !== "admin") {
      throw new AdminUserStatusError("Admin access required", 403);
    }
    const target = await tx.findUser(targetUserId);
    if (!target) {
      throw new AdminUserStatusError("User not found", 404);
    }
    if (target.isActive === isActive) {
      return target;
    }

    if (target.role === "admin" && target.isActive && !isActive && await tx.countActiveAdmins() <= 1) {
      throw new AdminUserStatusError("Cannot deactivate the last active administrator", 409);
    }
    if (actorUserId === targetUserId) {
      throw new AdminUserStatusError("You cannot change your own account status", 400);
    }

    await tx.setUserActive(targetUserId, isActive);
    await tx.appendAudit({
      actorUserId,
      targetUserId,
      action: isActive ? "reactivated" : "deactivated",
    });
    return { ...target, isActive };
  });
}
