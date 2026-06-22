import { Router } from "express";
import { db, studentsTable, tutorsTable, sessionsTable } from "@workspace/db";
import { eq, inArray, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/authMiddleware";

const router = Router();

function studentToJson(s: typeof studentsTable.$inferSelect) {
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
    parentId: s.parentId ?? null,
    dateOfBirth: s.dateOfBirth ?? null,
    isIdentityVerified: s.isIdentityVerified ?? false,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/students", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;

  if (user.role === "admin") {
    const students = await db.select().from(studentsTable);
    res.json(students.map(studentToJson));
    return;
  }

  if (user.role === "parent") {
    const students = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.parentId, user.id));
    res.json(students.map(studentToJson));
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
      .where(inArray(studentsTable.id, studentIds));
    res.json(students.map(studentToJson));
    return;
  }

  if (user.role === "student") {
    const students = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.userId, user.id));
    res.json(students.map(studentToJson));
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

  const { firstName, lastName, yearLevel, school, subjects, goals, dateOfBirth, parentId: bodyParentId } = req.body ?? {};

  if (!firstName || typeof firstName !== "string" || firstName.trim() === "") {
    res.status(400).json({ error: "firstName is required" });
    return;
  }

  const parentId = user.role === "admin"
    ? (bodyParentId ?? null)
    : user.id;

  const [student] = await db
    .insert(studentsTable)
    .values({
      firstName: firstName.trim(),
      lastName: lastName ? String(lastName).trim() : null,
      email: null,
      gradeLevel: yearLevel ? String(yearLevel).trim() : null,
      school: school ? String(school).trim() : null,
      subjects: subjects ? String(subjects).trim() : null,
      goals: goals ? String(goals).trim() : null,
      dateOfBirth: dateOfBirth ? String(dateOfBirth).trim() : null,
      parentId,
    })
    .returning();

  res.status(201).json(studentToJson(student));
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

  if (user.role === "admin") {
    res.json(studentToJson(student));
    return;
  }

  if (user.role === "parent" && student.parentId === user.id) {
    res.json(studentToJson(student));
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

  if (user.role !== "admin" && student.parentId !== user.id) {
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
