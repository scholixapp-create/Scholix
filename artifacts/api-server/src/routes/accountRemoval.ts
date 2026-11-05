import { Router } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, studentsTable, usersTable, accountDeletionRequestsTable, accountLifecycleActionsTable } from "@workspace/db";
import { UpdateStudentBody, RemoveStudentBody, ReviewDeletionRequestBody } from "@workspace/api-zod";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/authMiddleware";
import { AccountRemovalError, lockManagedStudent, removeStudentAccount, reviewAccountDeletion } from "../lib/accountRemoval";

const router = Router();
const validId = (id: number) => Number.isInteger(id) && id > 0 && id <= 2_147_483_647;
function handleError(error: unknown, res: import("express").Response) {
  if (error instanceof AccountRemovalError) { res.status(error.statusCode).json({ error: error.message }); return; }
  // A newly discovered dependent FK must fail closed, not silently delete it.
  if ((error as { cause?: { code?: string }; code?: string })?.cause?.code === "23503" || (error as { code?: string })?.code === "23503") {
    res.status(409).json({ error: "Dependent records prevent safe removal. No changes were saved; contact an administrator." }); return;
  }
  throw error;
}
router.patch("/students/:studentId", requireAuth, async (req, res) => {
  const studentId = Number(req.params.studentId);
  const body = UpdateStudentBody.strict().safeParse(req.body);
  const rawBirthDate = req.body?.dateOfBirth;
  const validBirthDate = rawBirthDate === undefined || rawBirthDate === null
    || (typeof rawBirthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawBirthDate)
      && !Number.isNaN(Date.parse(rawBirthDate))
      && new Date(rawBirthDate).toISOString().slice(0, 10) === rawBirthDate
      && rawBirthDate <= new Date().toISOString().slice(0, 10));
  if (!validId(studentId) || !body.success || !Object.keys(body.data).length
    || (body.data.firstName !== undefined && !body.data.firstName.trim())
    || !validBirthDate) {
    res.status(400).json({ error: "Enter a valid profile update and a non-future date of birth" }); return;
  }
  try {
    const updated = await db.transaction(async (tx) => {
      const { student } = await lockManagedStudent(tx, (req as AuthRequest).user.id, studentId);
      const { yearLevel, dateOfBirth, ...fields } = body.data;
      const values = {
        ...fields,
        ...(fields.firstName !== undefined ? { firstName: fields.firstName.trim() } : {}),
        ...(yearLevel !== undefined ? { gradeLevel: yearLevel } : {}),
        ...(dateOfBirth !== undefined ? { dateOfBirth: rawBirthDate as string | null } : {}),
        ...(dateOfBirth !== undefined && rawBirthDate !== student.dateOfBirth ? { isIdentityVerified: false } : {}),
      };
      const [row] = await tx.update(studentsTable).set(values).where(eq(studentsTable.id, studentId)).returning();
      await tx.insert(accountLifecycleActionsTable).values({ actorUserId: (req as AuthRequest).user.id, studentId, targetUserId: student.userId, action: "student_updated" });
      return row;
    });
    const { studentToJson } = await import("./students");
    res.json(studentToJson(updated));
  } catch (error) { handleError(error, res); }
});
router.delete("/students/:studentId", requireAuth, async (req, res) => {
  const studentId = Number(req.params.studentId);
  const body = RemoveStudentBody.strict().safeParse(req.body);
  if (!validId(studentId) || !body.success) { res.status(400).json({ error: "Confirm the student's full name" }); return; }
  try { res.json(await removeStudentAccount((req as AuthRequest).user.id, studentId, body.data.confirmationName)); }
  catch (error) { handleError(error, res); }
});
router.get("/admin/deletion-requests", requireAdmin, async (_req, res) => {
  res.json(await db.select({
    id: accountDeletionRequestsTable.id, userId: usersTable.id, email: usersTable.email,
    role: usersTable.role, firstName: usersTable.firstName, lastName: usersTable.lastName,
    reason: accountDeletionRequestsTable.reason, status: accountDeletionRequestsTable.status,
    requestedAt: accountDeletionRequestsTable.requestedAt, reviewedAt: accountDeletionRequestsTable.reviewedAt,
    reviewNotes: accountDeletionRequestsTable.reviewNotes,
  }).from(accountDeletionRequestsTable).innerJoin(usersTable, eq(accountDeletionRequestsTable.userId, usersTable.id))
    .orderBy(sql`CASE WHEN ${accountDeletionRequestsTable.status} = 'pending' THEN 0 ELSE 1 END`, desc(accountDeletionRequestsTable.requestedAt)));
});
router.patch("/admin/deletion-requests/:requestId", requireAdmin, async (req, res) => {
  const requestId = Number(req.params.requestId);
  const body = ReviewDeletionRequestBody.strict().safeParse(req.body);
  if (!validId(requestId) || !body.success) { res.status(400).json({ error: "Confirm the account email and decision" }); return; }
  try {
    res.json(await reviewAccountDeletion((req as AuthRequest).user.id, requestId, body.data.decision, body.data.confirmationEmail, body.data.notes));
  } catch (error) { handleError(error, res); }
});
export default router;
