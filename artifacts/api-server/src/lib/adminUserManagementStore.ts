import { db, usersTable, adminUserActionsTable, accountReapplicationsTable, authOtpTokensTable, passwordResetTokensTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import type { AdminUserStatusStore, AdminUserStatusTransaction } from "./adminUserManagement";

export const ADMIN_USER_MUTATION_LOCK_ID = 1_396_919_364;

export const adminUserStatusStore: AdminUserStatusStore = {
  transaction<T>(operation: (tx: AdminUserStatusTransaction) => Promise<T>): Promise<T> {
    return db.transaction(async (tx) => operation({
      lockStatusChanges: async () => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${ADMIN_USER_MUTATION_LOCK_ID})`);
      },
      findUser: async (userId) => {
        const [user] = await tx
          .select({ id: usersTable.id, role: usersTable.role, isActive: usersTable.isActive })
          .from(usersTable)
          .where(eq(usersTable.id, userId))
          .limit(1).for("update");
        return user;
      },
      countActiveAdmins: async () => {
        const [result] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(usersTable)
          .where(and(eq(usersTable.role, "admin"), eq(usersTable.isActive, true)));
        return result.count;
      },
      setUserActive: async (userId, isActive) => {
        const [application] = await tx.select().from(accountReapplicationsTable)
          .where(eq(accountReapplicationsTable.userId, userId)).for("update");
        const [target] = await tx.select().from(usersTable).where(eq(usersTable.id, userId));
        const approvedApplication = isActive && application?.verifiedAt && (target.role === "parent" || target.role === "tutor");
        await tx.update(usersTable).set({
          isActive,
          authVersion: sql`${usersTable.authVersion} + 1`,
          ...(approvedApplication ? {
            passwordHash: application.passwordHash,
            ...(target.role === "parent" ? { parentApproved: true } : {}),
          } : {}),
        }).where(eq(usersTable.id, userId));
        // OTPs/password-reset links issued before the status change cannot be reused.
        await tx.delete(authOtpTokensTable).where(eq(authOtpTokensTable.userId, userId));
        await tx.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.userId, userId));
        if (isActive) await tx.delete(accountReapplicationsTable).where(eq(accountReapplicationsTable.userId, userId));
      },
      appendAudit: async (action) => {
        await tx.insert(adminUserActionsTable).values(action);
      },
    }));
  },
};
