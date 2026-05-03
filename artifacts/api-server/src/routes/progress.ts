import { Router } from "express";
import { db, studentProgressTable, sessionsTable, tutorsTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.post("/sessions/:sessionId/progress", async (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
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

router.get("/sessions/:sessionId/progress", async (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const [entry] = await db
    .select()
    .from(studentProgressTable)
    .where(eq(studentProgressTable.sessionId, sessionId))
    .limit(1);

  res.json(entry ?? null);
});

router.get("/students/:studentId/progress", async (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) {
    res.status(400).json({ error: "Invalid student ID" });
    return;
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

  const enriched = await Promise.all(
    entries.map(async (e) => {
      const [tutorRow] = await db
        .select({ firstName: studentsTable.firstName })
        .from(tutorsTable)
        .innerJoin(studentsTable, eq(tutorsTable.id, e.tutorId))
        .where(eq(tutorsTable.id, e.tutorId))
        .limit(1);
      return {
        ...e,
        scheduledAt: e.scheduledAt.toISOString(),
        createdAt: e.createdAt.toISOString(),
      };
    })
  );

  res.json(enriched);
});

export default router;
