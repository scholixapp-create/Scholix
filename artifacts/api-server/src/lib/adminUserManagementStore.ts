import { db, usersTable, adminUserActionsTable } from "@workspace/db";
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
          .limit(1);
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
        await tx.update(usersTable).set({ isActive }).where(eq(usersTable.id, userId));
      },
      appendAudit: async (action) => {
        await tx.insert(adminUserActionsTable).values(action);
      },
    }));
  },
};
