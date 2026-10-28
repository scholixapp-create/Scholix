import {
  adminUserActionsTable,
  authOtpTokensTable,
  availabilityTable,
  db,
  legalAgreementsTable,
  notificationsTable,
  passwordResetTokensTable,
  studentsTable,
  tutorsTable,
  usersTable,
} from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import type {
  AdminUserDeletionStore,
  AdminUserDeletionTransaction,
} from "./adminUserDeletion";
import { ADMIN_USER_MUTATION_LOCK_ID } from "./adminUserManagementStore";

export const adminUserDeletionStore: AdminUserDeletionStore = {
  transaction<T>(operation: (tx: AdminUserDeletionTransaction) => Promise<T>): Promise<T> {
    return db.transaction(async (tx) => operation({
      lockStatusChanges: async () => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${ADMIN_USER_MUTATION_LOCK_ID})`);
      },
      findUser: async (userId) => {
        const [user] = await tx
          .select({
            id: usersTable.id,
            email: usersTable.email,
            role: usersTable.role,
            isActive: usersTable.isActive,
          })
          .from(usersTable)
          .where(eq(usersTable.id, userId))
          .limit(1)
          .for("update");
        return user;
      },
      countActiveAdmins: async () => {
        const [result] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(usersTable)
          .where(and(eq(usersTable.role, "admin"), eq(usersTable.isActive, true)));
        return result.count;
      },
      findDeletionBlockers: async (userId) => {
        const [result] = await tx
          .select({
            blockers: sql<string[]>`array_remove(ARRAY[
            CASE WHEN EXISTS (
              SELECT 1
              FROM sessions s
              WHERE s.tutor_id IN (SELECT id FROM tutors WHERE user_id = ${userId})
                 OR s.student_id IN (SELECT id FROM students WHERE user_id = ${userId})
            ) THEN 'booking or lesson history' END,
            CASE WHEN EXISTS (
              SELECT 1
              FROM payments p
              JOIN sessions s ON s.id = p.session_id
              WHERE s.tutor_id IN (SELECT id FROM tutors WHERE user_id = ${userId})
                 OR s.student_id IN (SELECT id FROM students WHERE user_id = ${userId})
            ) OR EXISTS (
              SELECT 1
              FROM invoices i
              JOIN sessions s ON s.id = i.session_id
              WHERE s.tutor_id IN (SELECT id FROM tutors WHERE user_id = ${userId})
                 OR s.student_id IN (SELECT id FROM students WHERE user_id = ${userId})
            ) THEN 'payment or invoice history' END,
            CASE WHEN EXISTS (
              SELECT 1
              FROM student_progress sp
              WHERE sp.tutor_id IN (SELECT id FROM tutors WHERE user_id = ${userId})
                 OR sp.student_id IN (SELECT id FROM students WHERE user_id = ${userId})
            ) THEN 'student progress history' END,
            CASE WHEN EXISTS (
              SELECT 1
              FROM reviews r
              WHERE r.author_id = ${userId}
                 OR r.tutor_id IN (SELECT id FROM tutors WHERE user_id = ${userId})
            ) THEN 'reviews' END,
            CASE WHEN EXISTS (
              SELECT 1
              FROM reports r
              WHERE r.reporter_user_id = ${userId}
                 OR r.reported_user_id = ${userId}
            ) THEN 'reports or moderation history' END,
            CASE WHEN EXISTS (
              SELECT 1
              FROM tutor_documents d
              JOIN tutors t ON t.id = d.tutor_id
              WHERE t.user_id = ${userId}
            ) OR EXISTS (
              SELECT 1
              FROM tutor_compliance c
              JOIN tutors t ON t.id = c.tutor_id
              WHERE t.user_id = ${userId}
            ) THEN 'tutor compliance records or uploaded documents' END,
            CASE WHEN EXISTS (
              SELECT 1
              FROM tutor_relationships tr
              WHERE tr.parent_id = ${userId}
                 OR tr.tutor_id IN (SELECT id FROM tutors WHERE user_id = ${userId})
            ) THEN 'tutor relationships' END,
            CASE WHEN EXISTS (
              SELECT 1
              FROM subject_requests sr
              WHERE sr.user_id = ${userId}
                 OR sr.tutor_id IN (SELECT id FROM tutors WHERE user_id = ${userId})
            ) THEN 'subject requests' END,
            CASE WHEN EXISTS (
              SELECT 1
              FROM account_deletion_requests adr
              WHERE adr.user_id = ${userId}
                 OR adr.reviewed_by = ${userId}
            ) THEN 'account-deletion review history' END,
            CASE WHEN EXISTS (
              SELECT 1
              FROM tutor_articles a
              WHERE a.author_id = ${userId}
            ) THEN 'tutor-authored content' END,
            CASE WHEN EXISTS (
              SELECT 1
              FROM students s
              WHERE s.parent_id = ${userId}
            ) THEN 'student profiles linked to this parent account' END,
            CASE WHEN EXISTS (
              SELECT 1
              FROM tutors t
              WHERE t.wwcc_verified_by = ${userId}
                 OR t.first_student_id IN (SELECT id FROM students WHERE user_id = ${userId})
                 OR (t.user_id = ${userId} AND t.first_student_id IS NOT NULL)
            ) THEN 'tutor verification or student-link history' END,
            CASE WHEN EXISTS (
              SELECT 1
              FROM tutors t
              WHERE t.user_id = ${userId}
                AND (t.is_approved = true OR t.verification_status <> 'pending')
            ) THEN 'tutor approval or verification history' END,
            CASE WHEN EXISTS (
              SELECT 1
              FROM availability a
              JOIN tutors t ON t.id = a.tutor_id
              WHERE t.user_id = ${userId}
                AND a.is_booked = true
            ) THEN 'booked tutor availability' END
          ]::text[], NULL::text)`,
          })
          .from(usersTable)
          .where(eq(usersTable.id, userId));

        return result?.blockers ?? [];
      },
      deleteAccount: async (userId) => {
        await tx
          .update(legalAgreementsTable)
          .set({ userId: null })
          .where(eq(legalAgreementsTable.userId, userId));
        await tx.delete(notificationsTable).where(eq(notificationsTable.userId, userId));
        await tx.delete(authOtpTokensTable).where(eq(authOtpTokensTable.userId, userId));
        await tx.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.userId, userId));

        const tutorIds = tx
          .select({ id: tutorsTable.id })
          .from(tutorsTable)
          .where(eq(tutorsTable.userId, userId));
        await tx.delete(availabilityTable).where(inArray(availabilityTable.tutorId, tutorIds));
        await tx.delete(studentsTable).where(eq(studentsTable.userId, userId));
        await tx.delete(tutorsTable).where(eq(tutorsTable.userId, userId));
        await tx.delete(usersTable).where(eq(usersTable.id, userId));
      },
      appendDeletionAudit: async (entry) => {
        await tx.insert(adminUserActionsTable).values({
          ...entry,
          action: "deleted",
        });
      },
    }));
  },
};
