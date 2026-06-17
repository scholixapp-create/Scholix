import { Router } from "express";
import { db, studentProgressTable, sessionsTable, tutorsTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/authMiddleware";

const router = Router();

async function canAccessSession(
  user: AuthRequest["user"],
  session: typeof sessionsTable.$inferSelect
): Promise<boolean> {
  if (user.role === "admin") return true;

  if (user.role === "tutor") {
    const [tutorRow] = await db
      .select({ id: tutorsTable.id })
      .from(tutorsTable)
      .where(eq(tutorsTable.userId, user.id))
      .limit(1);
    return !!tutorRow && tutorRow.id === session.tutorId;
  }

  if (user.role === "parent") {
    const [student] = await db
      .select({ parentId: studentsTable.parentId })
      .from(studentsTable)
      .where(eq(studentsTable.id, session.studentId))
      .limit(1);
    return !!student && student.parentId === user.id;
  }

  if (user.role === "student") {
    const [student] = await db
      .select({ userId: studentsTable.userId })
      .from(studentsTable)
      .where(eq(studentsTable.id, session.studentId))
      .limit(1);
    return !!student && student.userId === user.id;
  }

  return false;
}

router.post("/sessions/:sessionId/progress", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const sessionId = parseInt(req.params["sessionId"] as string, 10);
  if (isNaN(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const { score, notes } = req.body ?? {};
  if (typeof score !== "number" || score < 1 || score > 10) {
    res.status(400).json({ error: "score must be a number between 1 and 10" });
    return;
  }
  const parsed = { data: { score: Math.round(score), notes: notes as string | undefined } };

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Only the tutor of this session (or admin) can log progress — check before status
  if (user.role !== "admin") {
    const [tutorRow] = await db
      .select({ id: tutorsTable.id })
      .from(tutorsTable)
      .where(eq(tutorsTable.userId, user.id))
      .limit(1);
    if (!tutorRow || tutorRow.id !== session.tutorId) {
      res.status(403).json({ error: "Only the tutor of this session can log progress" });
      return;
    }
  }

  if (session.status !== "completed") {
    res.status(400).json({ error: "Can only log progress for completed sessions" });
    return;
  }

  const existing = await db
    .select()
    .from(studentProgressTable)
    .where(eq(studentProgressTable.sessionId, sessionId))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(studentProgressTable)
      .set({ score: parsed.data.score, notes: parsed.data.notes ?? null })
      .where(eq(studentProgressTable.sessionId, sessionId))
      .returning();
    res.json(updated);
    return;
  }

  const [entry] = await db
    .insert(studentProgressTable)
    .values({
      sessionId,
      tutorId: session.tutorId,
      studentId: session.studentId,
      score: parsed.data.score,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  res.status(201).json(entry);
});

router.get("/sessions/:sessionId/progress", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const sessionId = parseInt(req.params["sessionId"] as string, 10);
  if (isNaN(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (!(await canAccessSession(user, session))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [entry] = await db
    .select()
    .from(studentProgressTable)
    .where(eq(studentProgressTable.sessionId, sessionId))
    .limit(1);

  res.json(entry ?? null);
});

router.get("/students/:studentId/progress", requireAuth, async (req, res) => {
  const user = (req as AuthRequest).user;
  const studentId = parseInt(req.params["studentId"] as string, 10);
  if (isNaN(studentId)) {
    res.status(400).json({ error: "Invalid student ID" });
    return;
  }

  // Check access to this student's progress
  if (user.role !== "admin") {
    if (user.role === "parent") {
      const [student] = await db
        .select({ parentId: studentsTable.parentId })
        .from(studentsTable)
        .where(eq(studentsTable.id, studentId))
        .limit(1);
      if (!student || student.parentId !== user.id) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
    } else if (user.role === "tutor") {
      const [tutorRow] = await db
        .select({ id: tutorsTable.id })
        .from(tutorsTable)
        .where(eq(tutorsTable.userId, user.id))
        .limit(1);
      if (!tutorRow) { res.status(403).json({ error: "Access denied" }); return; }
      const [session] = await db
        .select({ id: sessionsTable.id })
        .from(sessionsTable)
        .where(and(eq(sessionsTable.tutorId, tutorRow.id), eq(sessionsTable.studentId, studentId)))
        .limit(1);
      if (!session) { res.status(403).json({ error: "Access denied" }); return; }
    } else if (user.role === "student") {
      const [student] = await db
        .select({ userId: studentsTable.userId })
        .from(studentsTable)
        .where(eq(studentsTable.id, studentId))
        .limit(1);
      if (!student || student.userId !== user.id) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
    } else {
      res.status(403).json({ error: "Access denied" });
      return;
    }
  }

  const entries = await db
    .select({
      id: studentProgressTable.id,
      sessionId: studentProgressTable.sessionId,
      tutorId: studentProgressTable.tutorId,
      studentId: studentProgressTable.studentId,
      score: studentProgressTable.score,
      notes: studentProgressTable.notes,
      createdAt: studentProgressTable.createdAt,
      subject: sessionsTable.subject,
      scheduledAt: sessionsTable.scheduledAt,
      durationMinutes: sessionsTable.durationMinutes,
    })
    .from(studentProgressTable)
    .innerJoin(sessionsTable, eq(studentProgressTable.sessionId, sessionsTable.id))
    .where(eq(studentProgressTable.studentId, studentId))
    .orderBy(sessionsTable.scheduledAt);

  const enriched = entries.map((e) => ({
    ...e,
    scheduledAt: e.scheduledAt.toISOString(),
    createdAt: e.createdAt.toISOString(),
  }));

  res.json(enriched);
});

export default router;
