import { Router } from "express";
import { db, studentsTable, tutorsTable, sessionsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, inArray, and, isNull, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/authMiddleware";
import { CreateStudentBody, RequestStudentAddressParams } from "@workspace/api-zod";
import { createNotification } from "../lib/notify";
import { bookingStatusEmailHtml } from "../lib/email";
import { config } from "../lib/config";
import { cleanStudentAddress } from "../lib/studentAddress";

const router = Router();

export function studentToJson(s: typeof studentsTable.$inferSelect, includePrivateFields = false) {
  return {
    id: s.id,
    userId: s.userId ?? null,
    firstName: s.firstName,
    lastName: s.lastName ?? null,
    email: s.email ?? null,
    yearLevel: s.gradeLevel ?? null,
    school: s.school ?? null,
    subjects: s.subjects ?? null,
    goals: s.goals ?? null,
    ...(includePrivateFields ? { address: s.address ?? null } : {}),
    parentId: s.parentId ?? null,
    ...(includePrivateFields ? { dateOfBirth: s.dateOfBirth ?? null } : {}),
    isIdentityVerified: s.isIdentityVerified ?? false,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/students", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;

  if (user.role === "admin") {
    const students = await db.select().from(studentsTable);
    res.json(students.map((student) => studentToJson(student, true)));
    return;
  }

  if (user.role === "parent") {
    const students = await db
      .select()
      .from(studentsTable)
      .where(and(eq(studentsTable.parentId, user.id), isNull(studentsTable.archivedAt)));
    res.json(students.map((student) => studentToJson(student, true)));
    return;
  }

  if (user.role === "tutor") {
    const [tutorRow] = await db
      .select({ id: tutorsTable.id })
      .from(tutorsTable)
      .where(eq(tutorsTable.userId, user.id))
      .limit(1);
    if (!tutorRow) { res.json([]); return; }

    const sessionRows = await db
      .select({ studentId: sessionsTable.studentId })
      .from(sessionsTable)
      .where(eq(sessionsTable.tutorId, tutorRow.id));
    const studentIds = [...new Set(sessionRows.map((s) => s.studentId))];
    if (studentIds.length === 0) { res.json([]); return; }

    const students = await db
      .select()
      .from(studentsTable)
      .where(and(inArray(studentsTable.id, studentIds), isNull(studentsTable.archivedAt)));
    res.json(students.map((student) => studentToJson(student)));
    return;
  }

  if (user.role === "student") {
    const students = await db
      .select()
      .from(studentsTable)
      .where(and(eq(studentsTable.userId, user.id), isNull(studentsTable.archivedAt)));
    res.json(students.map((student) => studentToJson(student)));
    return;
  }

  res.json([]);
});

router.post("/students", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;

  if (user.role !== "parent" && user.role !== "admin") {
    res.status(403).json({ error: "Only parents can add students" });
    return;
  }

  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success || !cleanStudentAddress(parsed.data.address)) {
    res.status(400).json({ error: "Enter the student's name and lesson address" });
    return;
  }
  const { firstName, lastName, yearLevel, school, subjects, goals, dateOfBirth, address, parentId: bodyParentId } = parsed.data;

  const parentId = user.role === "admin"
    ? (bodyParentId ?? null)
    : user.id;

  const student = await db.transaction(async (tx) => {
    if (parentId) {
      const { usersTable } = await import("@workspace/db");
      const [parent] = await tx.select().from(usersTable).where(eq(usersTable.id, parentId)).for("update");
      if (!parent?.isActive || parent.archivedAt || parent.role !== "parent") return null;
    }
    const [created] = await tx
    .insert(studentsTable)
    .values({
      firstName: firstName.trim(),
      lastName: lastName ? String(lastName).trim() : null,
      email: null,
      gradeLevel: yearLevel ? String(yearLevel).trim() : null,
      school: school ? String(school).trim() : null,
      subjects: subjects ? String(subjects).trim() : null,
      goals: goals ? String(goals).trim() : null,
      address: cleanStudentAddress(address)!,
      dateOfBirth: dateOfBirth ? String(dateOfBirth).trim() : null,
      parentId,
    })
    .returning();
    return created;
  });
  if (!student) { res.status(409).json({ error: "The parent account is unavailable" }); return; }

  res.status(201).json(studentToJson(student, user.role === "parent" || user.role === "admin"));
});

router.get("/students/:studentId", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const studentId = parseInt(req.params["studentId"] as string, 10);
  if (isNaN(studentId)) {
    res.status(400).json({ error: "Invalid student ID" });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, studentId))
    .limit(1);

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  if (student.archivedAt && user.role !== "admin") {
    res.status(404).json({ error: "Student not found" }); return;
  }

  if (user.role === "admin") {
    res.json(studentToJson(student, true));
    return;
  }

  if (user.role === "parent" && student.parentId === user.id) {
    res.json(studentToJson(student, true));
    return;
  }

  if (user.role === "student" && student.userId === user.id) {
    res.json(studentToJson(student));
    return;
  }

  if (user.role === "tutor") {
    const [tutorRow] = await db
      .select({ id: tutorsTable.id })
      .from(tutorsTable)
      .where(eq(tutorsTable.userId, user.id))
      .limit(1);
    if (tutorRow) {
      const [session] = await db
        .select({ id: sessionsTable.id })
        .from(sessionsTable)
        .where(and(
          eq(sessionsTable.tutorId, tutorRow.id),
          eq(sessionsTable.studentId, studentId)
        ))
        .limit(1);
      if (session) {
        res.json(studentToJson(student));
        return;
      }
    }
  }

  res.status(403).json({ error: "Access denied" });
});

router.post("/students/:studentId/address-request", requireAuth, async (req, res) => {
  const params = RequestStudentAddressParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid student ID" }); return; }
  const actor = (req as AuthRequest).user;
  if (actor.role !== "tutor") { res.status(403).json({ error: "Only the student's tutor can request their lesson address" }); return; }

  const [tutor] = await db.select({ id: tutorsTable.id }).from(tutorsTable)
    .where(eq(tutorsTable.userId, actor.id)).limit(1);
  if (!tutor) { res.status(403).json({ error: "Tutor profile not found" }); return; }
  const [student] = await db.select({
    id: studentsTable.id, firstName: studentsTable.firstName, address: studentsTable.address,
    parentId: studentsTable.parentId, archivedAt: studentsTable.archivedAt,
  }).from(studentsTable).where(eq(studentsTable.id, params.data.studentId)).limit(1);
  if (!student || student.archivedAt || !student.parentId) { res.status(404).json({ error: "Student not found" }); return; }

  const [relationship] = await db.select({ id: sessionsTable.id }).from(sessionsTable)
    .where(and(eq(sessionsTable.tutorId, tutor.id), eq(sessionsTable.studentId, student.id))).limit(1);
  if (!relationship) { res.status(403).json({ error: "You can only request details for a student in your tutoring relationship" }); return; }
  if (student.address?.trim()) { res.json({ requested: false }); return; }

  const [parent] = await db.select({
    id: usersTable.id, role: usersTable.role, email: usersTable.email, firstName: usersTable.firstName,
    isActive: usersTable.isActive, archivedAt: usersTable.archivedAt, parentApproved: usersTable.parentApproved,
  }).from(usersTable).where(eq(usersTable.id, student.parentId)).limit(1);
  if (!parent || parent.role !== "parent" || !parent.isActive || parent.archivedAt || !parent.parentApproved) {
    res.status(409).json({ error: "The student's parent account is not active and approved" }); return;
  }

  const actionUrl = `/parent/students?student=${student.id}&edit=address`;
  const [existing] = await db.select({ id: notificationsTable.id }).from(notificationsTable)
    .where(and(
      eq(notificationsTable.userId, parent.id),
      eq(notificationsTable.type, "student_address_requested"),
      eq(notificationsTable.actionUrl, actionUrl),
      eq(notificationsTable.isRead, false),
    )).orderBy(desc(notificationsTable.createdAt)).limit(1);
  if (existing) { res.json({ requested: true }); return; }

  const message = `${actor.firstName} ${actor.lastName} needs the lesson address for ${student.firstName} before an in-person booking can be arranged.`;
  await createNotification({
    userId: parent.id,
    type: "student_address_requested",
    title: "Add a lesson address",
    message,
    actionUrl,
    actionLabel: "Update student profile",
    emailSubject: `Lesson address needed for ${student.firstName}`,
    emailHtml: bookingStatusEmailHtml({
      title: "Add a lesson address",
      message: `${message} The address is shared only with this student's assigned tutor for an active in-person booking.`,
      actionUrl: new URL(actionUrl, config.frontendUrl).toString(),
    }),
  });
  res.json({ requested: true });
});

router.post("/students/:studentId/verify-identity", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const studentId = parseInt(req.params["studentId"] as string, 10);
  if (isNaN(studentId)) {
    res.status(400).json({ error: "Invalid student ID" });
    return;
  }

  const { dateOfBirth, declaration } = req.body ?? {};

  if (!dateOfBirth || !declaration) {
    res.status(400).json({ error: "dateOfBirth and declaration are required" });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, studentId))
    .limit(1);

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  if (student.archivedAt || (user.role !== "admin" && (user.role !== "parent" || student.parentId !== user.id))) {
    res.status(403).json({ error: "Only the parent of this student can verify their identity" });
    return;
  }

  const [updated] = await db
    .update(studentsTable)
    .set({ dateOfBirth, isIdentityVerified: true })
    .where(eq(studentsTable.id, studentId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json(studentToJson(updated));
});

router.post("/students/:studentId/invite", requireAuth, async (req, res) => {
  res.status(501).json({ error: "Student account invitations are not yet available. This feature is coming soon." });
});

export default router;
