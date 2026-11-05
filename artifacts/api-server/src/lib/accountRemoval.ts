import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  db, usersTable, studentsTable, sessionsTable, tutorsTable, authOtpTokensTable,
  passwordResetTokensTable, accountReapplicationsTable, accountDeletionRequestsTable,
  accountLifecycleActionsTable,
} from "@workspace/db";
import { ADMIN_USER_MUTATION_LOCK_ID } from "./adminUserManagementStore";

export type LifecycleTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const integerArray = (ids: number[]) => sql`ARRAY[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}]::integer[]`;
export class AccountRemovalError extends Error {
  constructor(message: string, readonly statusCode: 400 | 403 | 404 | 409) { super(message); }
}
export function mayManageStudent(actor: { id: number; role: string }, parentId: number | null) {
  return actor.role === "admin" || (actor.role === "parent" && parentId === actor.id);
}
export function fullStudentName(student: { firstName: string; lastName: string | null }) {
  return [student.firstName, student.lastName].filter(Boolean).join(" ").trim();
}
export function assertRemovalTarget(actorId: number, target: { id: number; role: string; archivedAt?: Date | null }) {
  if (actorId === target.id) throw new AccountRemovalError("You cannot remove your own account", 409);
  // All administrators are excluded, which also protects the last active admin.
  if (target.role === "admin") throw new AccountRemovalError("Administrator accounts cannot be removed through deletion requests", 409);
  if (target.archivedAt) throw new AccountRemovalError("This account is already archived", 409);
}
export async function lockLifecycleActor(tx: LifecycleTx, actorId: number, adminOnly = false) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${ADMIN_USER_MUTATION_LOCK_ID})`);
  const [actor] = await tx.select().from(usersTable).where(eq(usersTable.id, actorId)).for("update");
  if (!actor?.isActive || actor.archivedAt || (adminOnly && actor.role !== "admin")) {
    throw new AccountRemovalError("Access denied", 403);
  }
  return actor;
}
export async function lockManagedStudent(tx: LifecycleTx, actorId: number, studentId: number) {
  const actor = await lockLifecycleActor(tx, actorId);
  const [student] = await tx.select().from(studentsTable).where(eq(studentsTable.id, studentId)).for("update");
  if (!student || student.archivedAt) throw new AccountRemovalError("Student not found", 404);
  if (!mayManageStudent(actor, student.parentId)) throw new AccountRemovalError("Only the owning parent or an admin can manage this student", 403);
  return { actor, student };
}
async function hasStudentHistory(tx: LifecycleTx, studentId: number) {
  // Check every known durable student dependency, including the non-FK first pair.
  const result = await tx.execute(sql`SELECT (
    EXISTS (SELECT 1 FROM sessions WHERE student_id = ${studentId})
    OR EXISTS (SELECT 1 FROM student_progress WHERE student_id = ${studentId})
    OR EXISTS (SELECT 1 FROM tutors WHERE first_student_id = ${studentId})
  ) AS retained`);
  return Boolean((result.rows[0] as { retained: boolean }).retained);
}
async function assertNoUnresolvedSessions(tx: LifecycleTx, studentIds: number[], tutorIds: number[] = []) {
  const result = await tx.execute(sql`SELECT EXISTS (
    SELECT 1 FROM sessions
    WHERE status IN ('pending_payment', 'scheduled')
      AND (student_id = ANY(${integerArray(studentIds)}) OR tutor_id = ANY(${integerArray(tutorIds)}))
  ) AS blocked`);
  if ((result.rows[0] as { blocked: boolean }).blocked) {
    throw new AccountRemovalError("Resolve or cancel pending-payment and scheduled lessons before removing this account or student. Completed lessons and financial history will be retained.", 409);
  }
}
async function revokeAccounts(tx: LifecycleTx, userIds: number[], now: Date) {
  if (!userIds.length) return;
  await tx.update(usersTable).set({
    isActive: false, archivedAt: now, authVersion: sql`${usersTable.authVersion} + 1`,
  }).where(inArray(usersTable.id, userIds));
  await tx.delete(authOtpTokensTable).where(inArray(authOtpTokensTable.userId, userIds));
  await tx.delete(passwordResetTokensTable).where(inArray(passwordResetTokensTable.userId, userIds));
  await tx.delete(accountReapplicationsTable).where(inArray(accountReapplicationsTable.userId, userIds));
}
async function lockStudentAccounts(tx: LifecycleTx, studentIds: number[], linkedIds: number[]) {
  if (!linkedIds.length) return;
  const users = await tx.select().from(usersTable).where(inArray(usersTable.id, linkedIds))
    .orderBy(usersTable.id).for("update");
  if (users.length !== linkedIds.length || users.some((u) => u.role !== "student")) {
    throw new AccountRemovalError("A child profile has an unexpected account link. An administrator must resolve it before removal.", 409);
  }
  const external = await tx.select({ id: studentsTable.id }).from(studentsTable)
    .where(and(inArray(studentsTable.userId, linkedIds), sql`${studentsTable.id} <> ALL(${integerArray(studentIds)})`)).limit(1);
  if (external.length) throw new AccountRemovalError("A linked student sign-in is shared with another profile. An administrator must resolve this before removal.", 409);
}
async function removeProfiles(tx: LifecycleTx, studentIds: number[], now: Date) {
  let retained = false;
  for (const id of studentIds) {
    if (await hasStudentHistory(tx, id)) {
      await tx.update(studentsTable).set({ archivedAt: now }).where(eq(studentsTable.id, id));
      retained = true;
    } else {
      // Row locks prevent concurrent inserts via FKs. Unknown references reject
      // and roll back the whole transaction rather than cascading history.
      await tx.delete(studentsTable).where(eq(studentsTable.id, id));
    }
  }
  return retained;
}
export async function removeStudentAccount(actorId: number, studentId: number, confirmationName: string) {
  return db.transaction(async (tx) => {
    const { student } = await lockManagedStudent(tx, actorId, studentId);
    if (confirmationName.trim() !== fullStudentName(student)) throw new AccountRemovalError("Enter the student's full name exactly to confirm removal", 400);
    await assertNoUnresolvedSessions(tx, [student.id]);
    const linkedIds = student.userId ? [student.userId] : [];
    await lockStudentAccounts(tx, [student.id], linkedIds);
    const now = new Date();
    await revokeAccounts(tx, linkedIds, now);
    const retained = await removeProfiles(tx, [student.id], now);
    await tx.insert(accountLifecycleActionsTable).values({
      actorUserId: actorId, targetUserId: student.userId, studentId,
      action: "student_removed", retainedHistory: retained,
    });
    return {
      archived: retained || linkedIds.length > 0, affectedStudents: 1, affectedAccounts: linkedIds.length,
      message: retained
        ? "Student removed from active use. Linked sign-in access is revoked; lesson and business records remain restricted."
        : "Unused student profile permanently removed. Any linked sign-in is disabled and archived.",
    };
  });
}
export async function reviewAccountDeletion(actorId: number, requestId: number, decision: "approve" | "reject", confirmationEmail: string, notes?: string) {
  return db.transaction(async (tx) => {
    await lockLifecycleActor(tx, actorId, true);
    const [request] = await tx.select().from(accountDeletionRequestsTable)
      .where(eq(accountDeletionRequestsTable.id, requestId)).for("update");
    if (!request) throw new AccountRemovalError("Deletion request not found", 404);
    if (request.status !== "pending") throw new AccountRemovalError("This request has already been reviewed", 409);
    const [target] = await tx.select().from(usersTable).where(eq(usersTable.id, request.userId)).for("update");
    if (!target) throw new AccountRemovalError("Account not found", 404);
    if (confirmationEmail !== target.email) throw new AccountRemovalError("Confirmation email does not match the requested account", 400);
    if (actorId === target.id) throw new AccountRemovalError("You cannot review your own removal request", 409);
    const now = new Date();
    if (decision === "reject") {
      await tx.update(accountDeletionRequestsTable).set({ status: "rejected", reviewedAt: now, reviewedBy: actorId, reviewNotes: notes ?? null })
        .where(eq(accountDeletionRequestsTable.id, requestId));
      await tx.insert(accountLifecycleActionsTable).values({
        actorUserId: actorId, targetUserId: target.id, requestId, action: "deletion_request_rejected",
      });
      return { archived: false, affectedStudents: 0, affectedAccounts: 0, message: "Request rejected. Account access is unchanged." };
    }
    assertRemovalTarget(actorId, target);
    const profiles = await tx.select().from(studentsTable)
      .where(target.role === "parent" ? eq(studentsTable.parentId, target.id) : eq(studentsTable.userId, target.id))
      .orderBy(studentsTable.id).for("update");
    const studentIds = profiles.map((s) => s.id);
    const linkedIds = [...new Set(profiles.flatMap((s) => s.userId && s.userId !== target.id ? [s.userId] : []))];
    await lockStudentAccounts(tx, studentIds, linkedIds);
    const tutors = await tx.select({ id: tutorsTable.id }).from(tutorsTable).where(eq(tutorsTable.userId, target.id));
    await assertNoUnresolvedSessions(tx, studentIds, tutors.map((t) => t.id));
    const affectedUsers = [target.id, ...linkedIds];
    await revokeAccounts(tx, affectedUsers, now);
    await removeProfiles(tx, studentIds, now);
    await tx.update(accountDeletionRequestsTable).set({
      status: "approved", reviewedAt: now, reviewedBy: actorId, reviewNotes: notes ?? null,
    }).where(eq(accountDeletionRequestsTable.id, requestId));
    await tx.insert(accountLifecycleActionsTable).values({
      actorUserId: actorId, targetUserId: target.id, requestId, action: "family_archived", retainedHistory: true,
    });
    return {
      archived: true, affectedStudents: studentIds.length, affectedAccounts: affectedUsers.length,
      message: "Removal approved. Account and linked student access are revoked. Unused child profiles were removed; required identity, lesson, payment, dispute and audit records remain restricted. This is not erasure of all retained data.",
    };
  });
}

// Booking/payment transactions must lock the owner and child before writing.
// Family removal locks those same rows, so it cannot race a new booking.
export async function lockBookableStudent(tx: LifecycleTx, studentId: number) {
  const [owner] = await tx.select({ parentId: studentsTable.parentId }).from(studentsTable)
    .where(eq(studentsTable.id, studentId));
  if (!owner?.parentId) return false;
  const [parent] = await tx.select().from(usersTable).where(eq(usersTable.id, owner.parentId)).for("update");
  const [student] = await tx.select().from(studentsTable).where(eq(studentsTable.id, studentId)).for("update");
  return Boolean(parent?.isActive && parent.parentApproved && !parent.archivedAt && student && !student.archivedAt && student.parentId === parent.id);
}
