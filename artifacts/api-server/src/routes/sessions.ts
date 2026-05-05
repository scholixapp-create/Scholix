import { Router } from "express";
import { db, sessionsTable, tutorsTable, usersTable, studentsTable, invoicesTable } from "@workspace/db";
import { eq, and, ne, inArray } from "drizzle-orm";
import { CreateSessionBody, ListSessionsQueryParams } from "@workspace/api-zod";
import { createNotification } from "../lib/notify";
import { sessionBookedEmailHtml, sessionCompletedEmailHtml } from "../lib/email";
import { format } from "date-fns";

const router = Router();

type CommissionResult = {
  commissionRate: number;
  platformCommission: number;
  tutorEarnings: number;
  tier: string;
  isCommissionFree: boolean;
};

async function calculateCommission(
  tutorId: number,
  studentId: number,
  sessionId: number,
  totalAmount: number
): Promise<CommissionResult> {
  const [tutor] = await db
    .select()
    .from(tutorsTable)
    .where(eq(tutorsTable.id, tutorId))
    .limit(1);

  if (!tutor) {
    return { commissionRate: 0.3, platformCommission: totalAmount * 0.3, tutorEarnings: totalAmount * 0.7, tier: "standard", isCommissionFree: false };
  }

  // Rule 1: First student ever — lifetime 0% commission for all their sessions
  if (tutor.firstStudentId === studentId) {
    return {
      commissionRate: 0,
      platformCommission: 0,
      tutorEarnings: totalAmount,
      tier: "first_student_free",
      isCommissionFree: true,
    };
  }

  // Count completed sessions for this tutor BEFORE this one (excluding current session)
  const prevCompleted = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.tutorId, tutorId),
        eq(sessionsTable.status, "completed"),
        ne(sessionsTable.id, sessionId)
      )
    );

  // Rule 2: This is the tutor's very first completed session ever → set firstStudentId
  if (prevCompleted.length === 0 && !tutor.firstStudentId) {
    await db
      .update(tutorsTable)
      .set({ firstStudentId: studentId })
      .where(eq(tutorsTable.id, tutorId));

    return {
      commissionRate: 0,
      platformCommission: 0,
      tutorEarnings: totalAmount,
      tier: "first_student_free",
      isCommissionFree: true,
    };
  }

  // Rule 3: First completed session between this tutor and this specific student
  const prevWithStudent = prevCompleted.filter((s) => s.studentId === studentId);
  if (prevWithStudent.length === 0) {
    return {
      commissionRate: 0,
      platformCommission: 0,
      tutorEarnings: totalAmount,
      tier: "first_session_free",
      isCommissionFree: true,
    };
  }

  // Rule 4: Commission tier based on total completed sessions (including this one)
  const totalCompleted = prevCompleted.length + 1;
  let commissionRate = 0.3;
  let tier = "standard";

  if (totalCompleted >= 50) {
    commissionRate = 0.15;
    tier = "expert";
  } else if (totalCompleted >= 25) {
    commissionRate = 0.2;
    tier = "established";
  } else if (totalCompleted >= 10) {
    commissionRate = 0.25;
    tier = "growth";
  }

  return {
    commissionRate,
    platformCommission: totalAmount * commissionRate,
    tutorEarnings: totalAmount * (1 - commissionRate),
    tier,
    isCommissionFree: false,
  };
}

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
    isCommissionFree: s.isCommissionFree,
    tutorName,
    studentName,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/sessions/summary", async (req, res) => {
  const params = ListSessionsQueryParams.safeParse(req.query);
  const tutorId = params.success ? params.data.tutorId : undefined;
  const studentId = params.success ? params.data.studentId : undefined;

  const conditions = [];
  if (tutorId) conditions.push(eq(sessionsTable.tutorId, tutorId));
  if (studentId) conditions.push(eq(sessionsTable.studentId, studentId));
  // Exclude pending_payment from summary counts
  conditions.push(inArray(sessionsTable.status, ["scheduled", "completed", "cancelled"]));

  const sessions = await db.select().from(sessionsTable).where(and(...conditions));

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
  if (status) {
    conditions.push(eq(sessionsTable.status, status as "pending_payment" | "scheduled" | "completed" | "cancelled"));
  } else {
    // By default exclude pending_payment from general session lists (tutors shouldn't see unpaid sessions)
    if (tutorId && !studentId) {
      conditions.push(inArray(sessionsTable.status, ["scheduled", "completed", "cancelled"]));
    }
  }

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

  // Session created as pending_payment — confirmed only after payment
  const [session] = await db
    .insert(sessionsTable)
    .values({
      tutorId: parsed.data.tutorId,
      studentId: parsed.data.studentId,
      subject: parsed.data.subject,
      scheduledAt: new Date(parsed.data.scheduledAt),
      durationMinutes: parsed.data.durationMinutes,
      status: "pending_payment",
      isPaid: false,
      totalAmount,
    })
    .returning();

  const sessionJson = await sessionToJson(session);

  res.status(201).json(sessionJson);
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

  const commResult = await calculateCommission(
    updated.tutorId,
    updated.studentId,
    sessionId,
    updated.totalAmount
  );

  // Store isCommissionFree on the session
  if (commResult.isCommissionFree) {
    await db
      .update(sessionsTable)
      .set({ isCommissionFree: true })
      .where(eq(sessionsTable.id, sessionId));
  }

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
        platformCommission: commResult.platformCommission,
        tutorEarnings: commResult.tutorEarnings,
        commissionRate: commResult.commissionRate,
        commissionTier: commResult.tier,
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

  const dateStr = format(updated.scheduledAt, "EEE, MMM d 'at' h:mm a");
  const tutorName = tutorRow ? `${tutorRow.firstName} ${tutorRow.lastName}` : "Your tutor";
  const studentName = student ? `${student.firstName} ${student.lastName}` : "Student";

  // Notify tutor — session completed + earnings + upload notes action
  const [tutorUserRow2] = await db
    .select({ userId: tutorsTable.userId, firstName: usersTable.firstName })
    .from(tutorsTable)
    .innerJoin(usersTable, eq(tutorsTable.userId, usersTable.id))
    .where(eq(tutorsTable.id, updated.tutorId))
    .limit(1);

  if (tutorUserRow2) {
    await createNotification({
      userId: tutorUserRow2.userId,
      type: "action_upload_notes",
      title: "Upload progress notes",
      message: `${session.subject} with ${studentName} is done — log their progress now`,
      actionUrl: "/tutor/sessions",
      actionLabel: "Log notes",
      emailSubject: `Session completed — ${session.subject}`,
      emailHtml: sessionCompletedEmailHtml({
        recipientName: tutorUserRow2.firstName,
        tutorName,
        studentName,
        subject: updated.subject,
        date: dateStr,
        duration: updated.durationMinutes,
        totalAmount: updated.totalAmount,
        tutorEarnings: commResult.tutorEarnings,
        commissionTier: commResult.tier,
        isCommissionFree: commResult.isCommissionFree,
      }),
    });
  }

  // Notify parent — session completed + rate tutor action
  if (student?.parentId) {
    await createNotification({
      userId: student.parentId,
      type: "action_rate_session",
      title: "Rate your tutor",
      message: `${studentName}'s ${session.subject} session with ${tutorName} is done. How did it go?`,
      actionUrl: "/parent/sessions",
      actionLabel: "Leave a review",
      emailSubject: `Session completed — ${session.subject}`,
      emailHtml: sessionCompletedEmailHtml({
        recipientName: studentName.split(" ")[0],
        tutorName,
        studentName,
        subject: updated.subject,
        date: dateStr,
        duration: updated.durationMinutes,
        totalAmount: updated.totalAmount,
      }),
    });
  }

  res.json({
    session: sessionJson,
    invoice: {
      id: invoice.id,
      sessionId: invoice.sessionId,
      totalAmount: invoice.totalAmount,
      platformCommission: invoice.platformCommission,
      tutorEarnings: invoice.tutorEarnings,
      commissionRate: invoice.commissionRate,
      commissionTier: invoice.commissionTier,
      isCommissionFree: commResult.isCommissionFree,
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
