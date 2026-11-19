import { eq, sql } from "drizzle-orm";
import { db, adminSensitiveActionAttemptsTable, usersTable } from "@workspace/db";
import { verifyStoredPassword } from "./passwordVerification";
import { ADMIN_USER_MUTATION_LOCK_ID } from "./adminUserManagementStore";

export const ADMIN_SENSITIVE_ACTION_WINDOW_MS = 15 * 60 * 1000;
export const ADMIN_SENSITIVE_ACTION_MAX_ATTEMPTS = 5;

export type AdminReauthResult =
  | { status: "verified" }
  | { status: "invalid" }
  | { status: "locked" }
  | { status: "not_admin" };

export async function verifyAdminSensitiveActionPassword(
  userId: number,
  password: string,
  now = new Date(),
): Promise<AdminReauthResult> {
  return db.transaction(async (tx) => {
    // Serialize attempts across API instances so concurrent guesses cannot bypass the limit.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${ADMIN_USER_MUTATION_LOCK_ID})`);
    const [user] = await tx.select({
      id: usersTable.id,
      role: usersTable.role,
      isActive: usersTable.isActive,
      passwordHash: usersTable.passwordHash,
    }).from(usersTable).where(eq(usersTable.id, userId)).limit(1).for("update");
    if (!user || user.role !== "admin" || !user.isActive) return { status: "not_admin" };

    const [attempt] = await tx.select().from(adminSensitiveActionAttemptsTable)
      .where(eq(adminSensitiveActionAttemptsTable.userId, userId)).limit(1).for("update");
    const windowStart = new Date(now.getTime() - ADMIN_SENSITIVE_ACTION_WINDOW_MS);
    const activeAttempt = attempt && attempt.windowStartedAt >= windowStart ? attempt : undefined;

    if (activeAttempt && activeAttempt.failedAttempts >= ADMIN_SENSITIVE_ACTION_MAX_ATTEMPTS) {
      return { status: "locked" };
    }

    const matches = await verifyStoredPassword(password, user.passwordHash);
    if (matches) {
      await tx.delete(adminSensitiveActionAttemptsTable)
        .where(eq(adminSensitiveActionAttemptsTable.userId, userId));
      return { status: "verified" };
    }

    if (activeAttempt) {
      await tx.update(adminSensitiveActionAttemptsTable)
        .set({ failedAttempts: activeAttempt.failedAttempts + 1 })
        .where(eq(adminSensitiveActionAttemptsTable.userId, userId));
    } else if (attempt) {
      await tx.update(adminSensitiveActionAttemptsTable)
        .set({ failedAttempts: 1, windowStartedAt: now })
        .where(eq(adminSensitiveActionAttemptsTable.userId, userId));
    } else {
      await tx.insert(adminSensitiveActionAttemptsTable).values({
        userId,
        failedAttempts: 1,
        windowStartedAt: now,
      });
    }
    return { status: "invalid" };
  });
}
