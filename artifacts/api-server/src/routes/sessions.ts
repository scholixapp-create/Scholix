import { Router } from "express";
import { db, sessionsTable, tutorsTable, usersTable, studentsTable, invoicesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateSessionBody, ListSessionsQueryParams } from "@workspace/api-zod";

const router = Router();

const COMMISSION_RATE = 0.3;

async function sessionToJson(s: typeof sessionsTable.$inferSelect) {
  let tutorName: string | null = null;
  let studentName: string | null = null;

  const [tutorRow] = await db
    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(eq(tutorsTable.id, s.tutorId))
    .limit(1);

  if (tutorRow) tutorName = `${tutorRow.firstName} ${tutorRow.lastName}`;

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, s.studentId))
    .limit(1);

  if (student) studentName = `${student.firstName} ${student.lastName}`;

  return {
    id: s.id,
    tutorId: s.tutorId,
    studentId: s.studentId,
    subject: s.subject,
    scheduledAt: s.scheduledAt.toISOString(),
    durationMinutes: s.durationMinutes,
    status: s.status,
    isPaid: s.isPaid,
    totalAmount: s.totalAmount,
    tutorName,
    studentName,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/sessions/summary", async (req, res) => {
  const params = ListSessionsQueryParams.safeParse(req.query);
  const tutorId = params.success ? params.data.tutorId : undefined;
  const studentId = params.success ? params.data.studentId : undefined;

  let query = db.select().from(sessionsTable);
  const conditions = [];
  if (tutorId) conditions.push(eq(sessionsTable.tutorId, tutorId));
  if (studentId) conditions.push(eq(sessionsTable.studentId, studentId));

  const sessions = conditions.length > 0
    ? await db.select().from(sessionsTable).where(and(...conditions))
    : await query;

  const summary = { scheduled: 0, completed: 0, cancelled: 0, total: sessions.length };
  for (const s of sessions) {
    if (s.status === "scheduled") summary.scheduled++;
    else if (s.status === "completed") summary.completed++;
    else if (s.status === "cancelled") summary.cancelled++;
  }
  res.json(summary);
});

router.get("/sessions", async (req, res) => {
  const params = ListSessionsQueryParams.safeParse(req.query);
  const tutorId = params.success ? params.data.tutorId : undefined;
  const studentId = params.success ? params.data.studentId : undefined;
  const status = params.success ? params.data.status : undefined;

  const conditions = [];
  if (tutorId) conditions.push(eq(sessionsTable.tutorId, tutorId));
  if (studentId) conditions.push(eq(sessionsTable.studentId, studentId));
  if (status) conditions.push(eq(sessionsTable.status, status as "scheduled" | "completed" | "cancelled"));

  const sessions = conditions.length > 0
    ? await db.select().from(sessionsTable).where(and(...conditions))
    : await db.select().from(sessionsTable);

  const result = await Promise.all(sessions.map(sessionToJson));
  res.json(result);
});

router.post("/sessions", async (req, res) => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [tutor] = await db
    .select()
    .from(tutorsTable)
    .where(eq(tutorsTable.id, parsed.data.tutorId))
    .limit(1);

  if (!tutor) {
    res.status(404).json({ error: "Tutor not found" });
    return;
  }

  const totalAmount = (tutor.hourlyRate * parsed.data.durationMinutes) / 60;

  const [session] = await db
    .insert(sessionsTable)
    .values({
      tutorId: parsed.data.tutorId,
      studentId: parsed.data.studentId,
      subject: parsed.data.subject,
      scheduledAt: new Date(parsed.data.scheduledAt),
      durationMinutes: parsed.data.durationMinutes,
      status: "scheduled",
      isPaid: false,
      totalAmount,
    })
    .returning();

  res.status(201).json(await sessionToJson(session));
});

router.get("/sessions/:sessionId", async (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(await sessionToJson(session));
});

router.post("/sessions/:sessionId/complete", async (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [updated] = await db
    .update(sessionsTable)
    .set({ status: "completed" })
    .where(eq(sessionsTable.id, sessionId))
    .returning();

  const platformCommission = updated.totalAmount * COMMISSION_RATE;
  const tutorEarnings = updated.totalAmount * (1 - COMMISSION_RATE);

  const existingInvoice = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.sessionId, sessionId))
    .limit(1);

  let invoice;
  if (existingInvoice.length > 0) {
    invoice = existingInvoice[0];
  } else {
    [invoice] = await db
      .insert(invoicesTable)
      .values({
        sessionId,
        totalAmount: updated.totalAmount,
        platformCommission,
        tutorEarnings,
        commissionRate: COMMISSION_RATE,
      })
      .returning();
  }

  const sessionJson = await sessionToJson(updated);

  const [tutorRow] = await db
    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(eq(tutorsTable.id, updated.tutorId))
    .limit(1);

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, updated.studentId))
    .limit(1);

  res.json({
    session: sessionJson,
    invoice: {
      id: invoice.id,
      sessionId: invoice.sessionId,
      totalAmount: invoice.totalAmount,
      platformCommission: invoice.platformCommission,
      tutorEarnings: invoice.tutorEarnings,
      commissionRate: invoice.commissionRate,
      generatedAt: invoice.generatedAt.toISOString(),
      tutorName: tutorRow ? `${tutorRow.firstName} ${tutorRow.lastName}` : "",
      studentName: student ? `${student.firstName} ${student.lastName}` : "",
      subject: updated.subject,
      durationMinutes: updated.durationMinutes,
    },
  });
});

router.post("/sessions/:sessionId/cancel", async (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const [session] = await db
    .update(sessionsTable)
    .set({ status: "cancelled" })
    .where(eq(sessionsTable.id, sessionId))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(await sessionToJson(session));
});

export default router;
