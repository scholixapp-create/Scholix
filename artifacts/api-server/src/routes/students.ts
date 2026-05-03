import { Router } from "express";
import { db, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateStudentBody } from "@workspace/api-zod";

const router = Router();

function studentToJson(s: typeof studentsTable.$inferSelect) {
  return {
    id: s.id,
    userId: s.userId ?? null,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    gradeLevel: s.gradeLevel ?? null,
    parentId: s.parentId ?? null,
    dateOfBirth: s.dateOfBirth ?? null,
    isIdentityVerified: s.isIdentityVerified ?? false,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/students", async (_req, res) => {
  const students = await db.select().from(studentsTable);
  res.json(students.map(studentToJson));
});

router.post("/students", async (req, res) => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [student] = await db
    .insert(studentsTable)
    .values({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      gradeLevel: parsed.data.gradeLevel ?? null,
      parentId: parsed.data.parentId ?? null,
    })
    .returning();

  res.status(201).json(studentToJson(student));
});

router.get("/students/:studentId", async (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, studentId))
    .limit(1);

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json(studentToJson(student));
});

router.post("/students/:studentId/verify-identity", async (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  const { dateOfBirth, declaration } = req.body ?? {};

  if (!dateOfBirth || !declaration) {
    res.status(400).json({ error: "dateOfBirth and declaration are required" });
    return;
  }

  const [student] = await db
    .update(studentsTable)
    .set({ dateOfBirth, isIdentityVerified: true })
    .where(eq(studentsTable.id, studentId))
    .returning();

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json(studentToJson(student));
});

export default router;
