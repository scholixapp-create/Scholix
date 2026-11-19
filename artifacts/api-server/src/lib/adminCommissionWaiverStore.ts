import { db, adminUserActionsTable, tutorsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { ADMIN_USER_MUTATION_LOCK_ID } from "./adminUserManagementStore";
import type { CommissionWaiverStore, CommissionWaiverTransaction } from "./adminCommissionWaiver";

export const adminCommissionWaiverStore: CommissionWaiverStore = {
  transaction<T>(operation: (tx: CommissionWaiverTransaction) => Promise<T>): Promise<T> {
    return db.transaction(async (tx) => operation({
      lockWaiverChanges: async () => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${ADMIN_USER_MUTATION_LOCK_ID})`);
      },
      findActor: async (userId) => {
        const [actor] = await tx.select({
          id: usersTable.id,
          role: usersTable.role,
          isActive: usersTable.isActive,
        }).from(usersTable).where(eq(usersTable.id, userId)).limit(1).for("update");
        return actor;
      },
      findTutor: async (tutorId) => {
        const [row] = await tx.select({
          id: tutorsTable.id,
          userId: usersTable.id,
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          role: usersTable.role,
          isActive: usersTable.isActive,
          isApproved: tutorsTable.isApproved,
          commissionWaived: tutorsTable.commissionWaived,
        }).from(tutorsTable).innerJoin(usersTable, eq(usersTable.id, tutorsTable.userId))
          .where(eq(tutorsTable.id, tutorId)).limit(1).for("update");
        return row;
      },
      setWaiver: async (tutorId, enabled) => {
        await tx.update(tutorsTable).set({ commissionWaived: enabled })
          .where(eq(tutorsTable.id, tutorId));
      },
      appendAudit: async (entry) => {
        await tx.insert(adminUserActionsTable).values(entry);
      },
    }));
  },
};
