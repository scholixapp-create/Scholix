import { db, tutorsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function isBookableTutor(tutor: { isActive: boolean; isApproved: boolean; verificationStatus: string } | undefined): boolean {
  return !!tutor?.isActive && tutor.isApproved && tutor.verificationStatus === "verified";
}

// Locks the account and tutor until booking/payment confirmation commits, so a
// concurrent admin deactivation cannot race the final availability check.
export async function lockBookableTutor(tx: Transaction, tutorId: number): Promise<boolean> {
  const [tutor] = await tx.select({
    isActive: usersTable.isActive, isApproved: tutorsTable.isApproved,
    verificationStatus: tutorsTable.verificationStatus,
  }).from(tutorsTable).innerJoin(usersTable, eq(usersTable.id, tutorsTable.userId))
    .where(eq(tutorsTable.id, tutorId)).for("update");
  return isBookableTutor(tutor);
}
